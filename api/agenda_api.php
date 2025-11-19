<?php
// --- api/agenda_api.php (VERSIÓN COMPLETA Y CORREGIDA) ---

/*
 * PASO 1: Habilitamos TODOS los errores para depuración.
 * (Una vez que todo funcione, puedes volver a 'error_reporting(0)')
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

session_start();

/*
 * PASO 2: Requerimos el archivo de conexión.
 * (Asumimos que 'conexion.php' ya está corregido y solo conecta a la BD)
 */
require 'conexion.php'; 

// --- SEGURIDAD ---
if (!isset($_SESSION['loggedin']) || $_SESSION['role'] !== 'medico') {
    http_response_code(403); // Forbidden
    // (Usamos 'die' aquí porque $response no está definido hasta después)
    die(json_encode(['success' => false, 'error' => 'Acceso no autorizado.']));
}

$method = $_SERVER['REQUEST_METHOD'];
$response = ['success' => false, 'error' => 'Acción no válida.'];

try {
    
    // --- LÓGICA PARA PETICIONES GET (Leer datos) ---
    if ($method === 'GET') {
        $action = isset($_GET['action']) ? $_GET['action'] : '';

        if ($action === 'get_all') {
            // Preparamos la respuesta con nombres en español
            $response['citas'] = [];
            $response['bloqueos'] = [];
            $response['pacientes'] = []; 

            // 1. Obtener Citas (de la tabla `citas`)
            // (Asegúrate de que la tabla 'citas' exista en 'consultorio_db')
            $result_citas = $conn->query("SELECT id, id_paciente, fecha, hora, estado FROM citas");
            if ($result_citas) {
                while ($row = $result_citas->fetch_assoc()) {
                    $response['citas'][] = $row;
                }
            } else {
                // Si la consulta falla, esto lanzará la Excepción
                throw new Exception("Error al cargar citas: " . $conn->error);
            }
            
            // 2. Obtener Bloqueos (de la tabla `horarios_bloqueados`)
            // (Asegúrate de que la tabla 'horarios_bloqueados' exista)
            $result_bloqueos = $conn->query("SELECT id, fecha, hora FROM horarios_bloqueados");
            if ($result_bloqueos) {
                while ($row = $result_bloqueos->fetch_assoc()) {
                    $response['bloqueos'][] = $row;
                }
            } else {
                throw new Exception("Error al cargar bloqueos: " . $conn->error);
            }

            // 3. Obtener Pacientes (de la tabla `pacientes`)
            // (Asegúrate de que la tabla 'pacientes' exista)
            $result_pacientes = $conn->query("SELECT id, nombre_completo FROM pacientes");
            if ($result_pacientes) {
                while ($row = $result_pacientes->fetch_assoc()) {
                    $response['pacientes'][] = $row;
                }
            } else {
                throw new Exception("Error al cargar pacientes: " . $conn->error);
            }

            $response['success'] = true;
            unset($response['error']); // Quitar el error por defecto
        }
    }
    
    // --- LÓGICA PARA PETICIONES POST (Crear, Actualizar, Borrar) ---
    elseif ($method === 'POST') {
        $datos = @json_decode(file_get_contents("php://input"), true);
        $action = isset($datos['action']) ? $datos['action'] : '';

        // ¡Iniciamos la transacción SOLO para POST!
        $conn->autocommit(FALSE);

        switch ($action) {

            // --- Acción: 'create_appt' ---
            case 'create_appt':
                $id_paciente = isset($datos['id_paciente']) ? intval($datos['id_paciente']) : 0;
                $fecha = isset($datos['fecha']) ? $datos['fecha'] : '';
                $hora = isset($datos['hora']) ? $datos['hora'] : '';

                if (empty($id_paciente) || empty($fecha) || empty($hora)) {
                    throw new Exception('Faltan datos para agendar la cita.');
                }

                // 1. Revisar si el slot está bloqueado
                $stmt_check_block = $conn->prepare("SELECT id FROM horarios_bloqueados WHERE fecha = ? AND hora = ?");
                $stmt_check_block->bind_param("ss", $fecha, $hora);
                $stmt_check_block->execute();
                if ($stmt_check_block->get_result()->num_rows > 0) {
                    throw new Exception('El horario ya está bloqueado o ocupado.');
                }
                $stmt_check_block->close();
                
                // 2. Crear la cita
                $stmt_create_appt = $conn->prepare("INSERT INTO citas (id_paciente, fecha, hora, estado) VALUES (?, ?, ?, 'activa')");
                $stmt_create_appt->bind_param("iss", $id_paciente, $fecha, $hora);
                if (!$stmt_create_appt->execute()) {
                    throw new Exception("Error al crear cita: " . $stmt_create_appt->error);
                }
                $newApptId = $conn->insert_id;
                $stmt_create_appt->close();

                // 3. Bloquear el slot
                $stmt_block_slot = $conn->prepare("INSERT INTO horarios_bloqueados (fecha, hora) VALUES (?, ?)");
                $stmt_block_slot->bind_param("ss", $fecha, $hora);
                if (!$stmt_block_slot->execute()) {
                    throw new Exception("Error al bloquear horario: " . $stmt_block_slot->error);
                }
                $stmt_block_slot->close();

                // 4. Guardar en historial
                $history_data = json_encode(['fecha' => $fecha, 'hora' => $hora]);
                $stmt_history = $conn->prepare("INSERT INTO historial_clinico (id_paciente, tipo_registro, datos) VALUES (?, 'Cita agendada', ?)");
                $stmt_history->bind_param("is", $id_paciente, $history_data);
                $stmt_history->execute();
                $stmt_history->close();

                $conn->commit(); // ¡Todo salió bien! Confirmamos los cambios.
                $response = ['success' => true, 'message' => 'Cita creada y horario bloqueado.', 'newId' => $newApptId];
                break;

            // --- Acción: 'toggle_block' ---
            case 'toggle_block':
                $fecha = isset($datos['fecha']) ? $datos['fecha'] : '';
                $hora = isset($datos['hora']) ? $datos['hora'] : '';
                if (empty($fecha) || empty($hora)) throw new Exception('Faltan datos.');

                // Revisar si hay una CITA
                $stmt_check_appt = $conn->prepare("SELECT id FROM citas WHERE fecha = ? AND hora = ?");
                $stmt_check_appt->bind_param("ss", $fecha, $hora);
                $stmt_check_appt->execute();
                if ($stmt_check_appt->get_result()->num_rows > 0) {
                    throw new Exception('No se puede modificar. El horario está ocupado por una cita.');
                }
                $stmt_check_appt->close();

                // Revisar si está bloqueado
                $stmt_check_block = $conn->prepare("SELECT id FROM horarios_bloqueados WHERE fecha = ? AND hora = ?");
                $stmt_check_block->bind_param("ss", $fecha, $hora);
                $stmt_check_block->execute();
                $result_block = $stmt_check_block->get_result();

                if ($result_block->num_rows > 0) {
                    // Sí está bloqueado -> Desbloquear (Borrar)
                    $block_id = $result_block->fetch_assoc()['id'];
                    $stmt_delete = $conn->prepare("DELETE FROM horarios_bloqueados WHERE id = ?");
                    $stmt_delete->bind_param("i", $block_id);
                    $stmt_delete->execute();
                    $stmt_delete->close();
                    $response['message'] = 'Horario desbloqueado.';
                } else {
                    // No está bloqueado -> Bloquear (Insertar)
                    $stmt_insert = $conn->prepare("INSERT INTO horarios_bloqueados (fecha, hora) VALUES (?, ?)");
                    $stmt_insert->bind_param("ss", $fecha, $hora);
                    $stmt_insert->execute();
                    $stmt_insert->close();
                    $response['message'] = 'Horario bloqueado.';
                }
                $stmt_check_block->close();
                
                $conn->commit();
                $response['success'] = true;
                break;

            // --- Acción: 'delete_appt' ---
            case 'delete_appt':
                $id_cita = isset($datos['id']) ? intval($datos['id']) : 0;
                if (empty($id_cita)) throw new Exception('ID de cita no proporcionado.');
                
                // 1. Obtener datos de la cita ANTES de borrarla
                $stmt_get = $conn->prepare("SELECT id_paciente, fecha, hora FROM citas WHERE id = ?");
                $stmt_get->bind_param("i", $id_cita);
                $stmt_get->execute();
                $result_get = $stmt_get->get_result();
                if ($result_get->num_rows === 0) throw new Exception('Cita no encontrada.');
                $appt_data = $result_get->fetch_assoc();
                $stmt_get->close();

                // 2. Borrar la cita
                $stmt_delete = $conn->prepare("DELETE FROM citas WHERE id = ?");
                $stmt_delete->bind_param("i", $id_cita);
                if (!$stmt_delete->execute()) throw new Exception('Error al borrar la cita.');
                $stmt_delete->close();
                
                // 3. Desbloquear el slot
                $stmt_unblock = $conn->prepare("DELETE FROM horarios_bloqueados WHERE fecha = ? AND hora = ?");
                $stmt_unblock->bind_param("ss", $appt_data['fecha'], $appt_data['hora']);
                $stmt_unblock->execute();
                $stmt_unblock->close();

                // 4. Guardar en historial
                $history_data = json_encode(['fecha' => $appt_data['fecha'], 'hora' => $appt_data['hora'], 'id_cita' => $id_cita]);
                $stmt_history = $conn->prepare("INSERT INTO historial_clinico (id_paciente, tipo_registro, datos) VALUES (?, 'Cita eliminada', ?)");
                $stmt_history->bind_param("is", $appt_data['id_paciente'], $history_data);
                $stmt_history->execute();
                $stmt_history->close();

                $conn->commit();
                $response = ['success' => true, 'message' => 'Cita eliminada y horario desbloqueado.'];
                break;
                
            // --- Acción: 'complete_appt' ---
            case 'complete_appt':
                $id_cita = isset($datos['id']) ? intval($datos['id']) : 0;
                if (empty($id_cita)) throw new Exception('ID de cita no proporcionado.');

                // 1. Actualizar la cita
                $stmt_complete = $conn->prepare("UPDATE citas SET estado = 'completada', fecha_completada = NOW() WHERE id = ?");
                $stmt_complete->bind_param("i", $id_cita);
                if (!$stmt_complete->execute()) throw new Exception('Error al finalizar la cita.');
                $stmt_complete->close();

                // 2. Obtener datos para el historial
                $stmt_get = $conn->prepare("SELECT id_paciente, fecha, hora FROM citas WHERE id = ?");
                $stmt_get->bind_param("i", $id_cita);
                $stmt_get->execute();
                $appt_data = $stmt_get->get_result()->fetch_assoc();
                $stmt_get->close();

                // 3. Guardar en historial
                $history_data = json_encode(['fecha' => $appt_data['fecha'], 'hora' => $appt_data['hora'], 'id_cita' => $id_cita]);
                $stmt_history = $conn->prepare("INSERT INTO historial_clinico (id_paciente, tipo_registro, datos) VALUES (?, 'Cita finalizada', ?)");
                $stmt_history->bind_param("is", $appt_data['id_paciente'], $history_data);
                $stmt_history->execute();
                $stmt_history->close();

                $conn->commit();
                $response = ['success' => true, 'message' => 'Cita marcada como finalizada.'];
                break;
                
            default:
                $conn->rollback(); // Revertir si la acción POST no es válida
                throw new Exception('Acción POST no válida en agenda_api.');
        }
    }

} catch (Exception $e) {
    /*
     * PASO 3: El bloque CATCH corregido.
     * Solo revierte la transacción si el método era POST.
     */
    if ($method === 'POST') {
        $conn->rollback();
    }
    http_response_code(400); // Bad Request
    
    /*
     * Esto es lo más importante: enviamos el mensaje de error 
     * de la base de datos (ej. "Table 'citas' doesn't exist")
     * de vuelta al JavaScript.
     */
    $response['error'] = $e->getMessage();
}

// 4. Cerramos la conexión
$conn->close();

/*
 * PASO 5: Establecemos la cabecera JSON.
 * Lo hacemos aquí al final para que los errores de PHP (si los hay)
 * se muestren como texto/html y los podamos leer.
 */
header('Content-Type: application/json');

// 6. Devolvemos la respuesta final a app.js
echo json_encode($response);
?>
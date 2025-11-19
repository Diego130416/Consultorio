<?php
// --- api/historial_api.php (CORREGIDO) ---

// Silenciamos todos los errores
error_reporting(0);
ini_set('display_errors', 0);

session_start();
require 'conexion.php';

// --- SEGURIDAD ---
// (Mantenemos la seguridad, ya que app.js la espera)
if (!isset($_SESSION['loggedin']) || $_SESSION['role'] !== 'medico') {
    http_response_code(403); // Forbidden
    echo json_encode(['success' => false, 'error' => 'Acceso no autorizado.']);
    die();
}

$method = $_SERVER['REQUEST_METHOD'];
$response = ['success' => false, 'error' => 'Acción no válida.'];

try {
    
    // --- LÓGICA PARA PETICIONES GET (Leer datos) ---
    if ($method === 'GET') {
        // --- CORRECCIÓN (no usamos ??) ---
        $action = isset($_GET['action']) ? $_GET['action'] : '';
        $patientId = isset($_GET['id']) ? intval($_GET['id']) : 0;
        $historyId = isset($_GET['hid']) ? intval($_GET['hid']) : 0;

        // --- Acción: 'get_history' ---
        // Usado por: paciente_full.html
        if ($action === 'get_history' && !empty($patientId)) {
            // Usamos la tabla 'historial_clinico'
            $stmt = $conn->prepare("SELECT * FROM historial_clinico WHERE id_paciente = ? ORDER BY fecha_registro DESC");
            $stmt->bind_param("i", $patientId);
            $stmt->execute();
            $result = $stmt->get_result();

            $history = [];
            while ($row = $result->fetch_assoc()) {
                // TRADUCCIÓN: de BD (español) a JS (genérico/inglés)
                $history[] = [
                    'id' => $row['id'],
                    'patientId' => $row['id_paciente'],
                    'type' => $row['tipo_registro'],
                    'data' => json_decode($row['datos'], true), // Decodificamos el JSON
                    'timestamp' => $row['fecha_registro']
                ];
            }
            $stmt->close();
            $response = ['success' => true, 'history' => $history];
        
        // --- Acción: 'find_patient' ---
        // Usado por: formularios de edición (ej. receta.html)
        } elseif ($action === 'find_patient' && !empty($historyId)) {
            $stmt = $conn->prepare("SELECT id_paciente FROM historial_clinico WHERE id = ?");
            $stmt->bind_param("i", $historyId);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($row = $result->fetch_assoc()) {
                 // TRADUCCIÓN: De 'id_paciente' a 'patientId'
                $response = ['success' => true, 'patientId' => $row['id_paciente']];
            } else {
                throw new Exception('No se encontró el historial.');
            }
            $stmt->close();
        }
    }
    
    // --- LÓGICA PARA PETICIONES POST (Crear, Actualizar) ---
    elseif ($method === 'POST') {
        $datos = @json_decode(file_get_contents("php://input"), true);
        // --- CORRECCIÓN (no usamos ??) ---
        $action = isset($datos['action']) ? $datos['action'] : '';

        if ($action === 'save_item') {
            // TRADUCCIÓN: app.js nos envía claves genéricas (inglés)
            $patientId = isset($datos['patientId']) ? intval($datos['patientId']) : 0;
            $historyId = isset($datos['historyId']) ? intval($datos['historyId']) : null;
            $type = isset($datos['type']) ? $datos['type'] : '';
            $data = isset($datos['data']) ? $datos['data'] : null;

            if (empty($patientId) || empty($type) || is_null($data)) {
                throw new Exception('Faltan datos (patientId, type, data) para guardar en el historial.');
            }

            // Convertimos el objeto/array de datos de JS a un string JSON para guardarlo
            $data_json = json_encode($data);

            if ($historyId) {
                // --- MODO ACTUALIZACIÓN ---
                // TRADUCCIÓN: Usamos las claves genéricas para actualizar las columnas en español
                $stmt = $conn->prepare("UPDATE historial_clinico SET tipo_registro = ?, datos = ?, fecha_registro = NOW() WHERE id = ? AND id_paciente = ?");
                $stmt->bind_param("ssii", $type, $data_json, $historyId, $patientId);
                
                if ($stmt->execute()) {
                    $response = ['success' => true, 'message' => 'Elemento del historial actualizado.'];
                } else {
                    throw new Exception("Error al actualizar historial: " . $stmt->error);
                }
                $stmt->close();

            } else {
                // --- MODO CREACIÓN ---
                // TRADUCCIÓN: Usamos las claves genéricas para insertar en las columnas en español
                $stmt = $conn->prepare("INSERT INTO historial_clinico (id_paciente, tipo_registro, datos) VALUES (?, ?, ?)");
                $stmt->bind_param("iss", $patientId, $type, $data_json);

                if ($stmt->execute()) {
                    $newHistoryId = $conn->insert_id;
                    $response = ['success' => true, 'message' => 'Elemento guardado en el historial.', 'newId' => $newHistoryId];
                } else {
                    throw new Exception("Error al guardar en historial: " . $stmt->error);
                }
                $stmt->close();
            }
        }
    }

} catch (Exception $e) {
    // Si algo falla
    http_response_code(400); // Bad Request
    $response['error'] = $e->getMessage();
}

// Cerramos la conexión
$conn->close();

// Devolvemos la respuesta final a app.js
echo json_encode($response);
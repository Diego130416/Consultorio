<?php
// --- api/pacientes_api.php (CORRECCIÓN FINAL-FINAL-VERIFICADA) ---

// Habilitamos errores para depuración
error_reporting(E_ALL);
ini_set('display_errors', 1);

session_start();
require 'conexion.php'; 

// --- SEGURIDAD ---
if (!isset($_SESSION['loggedin']) || $_SESSION['role'] !== 'medico') {
    http_response_code(403);
    header('Content-Type: application/json'); 
    die(json_encode(['success' => false, 'error' => 'Acceso no autorizado.']));
}

$method = $_SERVER['REQUEST_METHOD'];
$response = ['success' => false, 'error' => 'Acción no válida.'];

try {
    
    // --- LÓGICA GET (Leer datos) ---
    if ($method === 'GET') {
        $action = isset($_GET['action']) ? $_GET['action'] : '';

        switch ($action) {
            
            case 'get_all':
                $result = $conn->query("SELECT id, nombre_completo, rfc FROM pacientes ORDER BY nombre_completo ASC");
                if ($result) {
                    $patients = [];
                    while ($row = $result->fetch_assoc()) {
                        $patients[] = $row;
                    }
                    $response = ['success' => true, 'patients' => $patients];
                } else {
                    throw new Exception("Error al cargar pacientes: " . $conn->error);
                }
                break;

            case 'get_one':
                $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
                if (empty($id)) throw new Exception('ID de paciente no proporcionado.');

                $stmt = $conn->prepare("SELECT * FROM pacientes WHERE id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                $result = $stmt->get_result();

                if ($result->num_rows === 1) {
                    $patient = $result->fetch_assoc();
                    
                    $patient['alergias'] = json_decode($patient['alergias'], true);
                    $patient['enfermedades_cronicas'] = json_decode($patient['enfermedades_cronicas'], true);
                    $patient['cirugias_previas'] = json_decode($patient['cirugias_previas'], true);
                    $patient['medicamentos_actuales'] = json_decode($patient['medicamentos_actuales'], true);
                    $patient['detalle_sustancias'] = json_decode($patient['detalle_sustancias'], true);

                    $response = ['success' => true, 'patient' => $patient];
                } else {
                    throw new Exception('Paciente no encontrado.');
                }
                $stmt->close();
                break;
            
            default:
                 throw new Exception('Acción GET no válida.');
        }
    } 
    
    // --- LÓGICA POST (Crear, Actualizar, Borrar) ---
    elseif ($method === 'POST') {
        $datos = @json_decode(file_get_contents("php://input"), true);
        $action = isset($datos['action']) ? $datos['action'] : '';

        switch ($action) {

            // --- Acción: 'create' ---
            case 'create':
                $data = $datos['patient']; 

                if (!empty($data['rfc'])) {
                    $stmt_check_rfc = $conn->prepare("SELECT id FROM pacientes WHERE rfc = ?");
                    $stmt_check_rfc->bind_param("s", $data['rfc']);
                    $stmt_check_rfc->execute();
                    if ($stmt_check_rfc->get_result()->num_rows > 0) {
                        throw new Exception("Error: Ya existe un paciente con este RFC (" . $data['rfc'] . ").");
                    }
                    $stmt_check_rfc->close();
                }

                $stmt_check_name = $conn->prepare("SELECT id FROM pacientes WHERE nombre = ? AND apellido_paterno = ? AND apellido_materno = ? AND fecha_nacimiento = ?");
                $stmt_check_name->bind_param("ssss", $data['nombre'], $data['apellido_paterno'], $data['apellido_materno'], $data['fecha_nacimiento']);
                $stmt_check_name->execute();
                if ($stmt_check_name->get_result()->num_rows > 0) {
                    throw new Exception("Error: Ya existe un paciente con este nombre completo y fecha de nacimiento.");
                }
                $stmt_check_name->close();

                $alergias_json = json_encode(isset($data['alergias']) ? $data['alergias'] : []);
                $cronicas_json = json_encode(isset($data['enfermedades_cronicas']) ? $data['enfermedades_cronicas'] : []);
                $cirugias_json = json_encode(isset($data['cirugias_previas']) ? $data['cirugias_previas'] : []);
                $medicamentos_json = json_encode(isset($data['medicamentos_actuales']) ? $data['medicamentos_actuales'] : []);
                $sustancias_json = json_encode(isset($data['detalle_sustancias']) ? $data['detalle_sustancias'] : new stdClass()); 

                $sql = "INSERT INTO pacientes (
                            nombre, apellido_paterno, apellido_materno, nombre_completo, fecha_nacimiento, edad, sexo, telefono, rfc, 
                            alergias, enfermedades_cronicas, cirugias_previas, medicamentos_actuales, 
                            antecedentes_familiares, motivo_consulta, sintomas, consumo_sustancias, detalle_sustancias
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                
                $stmt = $conn->prepare($sql);
                
                // Esta cadena de 18 caracteres es CORRECTA para INSERT (18 variables)
                $stmt->bind_param("sssssissssssssssss", 
                    $data['nombre'], $data['apellido_paterno'], $data['apellido_materno'], $data['nombre_completo'], 
                    $data['fecha_nacimiento'], $data['edad'], // 'i' (int)
                    $data['sexo'], $data['telefono'], $data['rfc'], // 's' (string)
                    $alergias_json, $cronicas_json, $cirugias_json, $medicamentos_json,
                    $data['antecedentes_familiares'], $data['motivo_consulta'], $data['sintomas'], 
                    $data['consumo_sustancias'], $sustancias_json
                );
                
                if ($stmt->execute()) {
                    $newId = $conn->insert_id;
                    $response = ['success' => true, 'message' => 'Paciente creado con éxito.', 'newId' => $newId];
                } else {
                    throw new Exception("Error al crear paciente: " . $stmt->error);
                }
                $stmt->close();
                break;

            // --- Acción: 'update' ---
            case 'update':
                $data = $datos['patient'];
                $id = isset($data['id']) ? intval($data['id']) : 0;
                if (empty($id)) throw new Exception('ID de paciente no proporcionado.');

                if (!empty($data['rfc'])) {
                    $stmt_check_rfc = $conn->prepare("SELECT id FROM pacientes WHERE rfc = ? AND id != ?");
                    $stmt_check_rfc->bind_param("si", $data['rfc'], $id);
                    $stmt_check_rfc->execute();
                    if ($stmt_check_rfc->get_result()->num_rows > 0) {
                        throw new Exception("Error: El RFC ingresado (" . $data['rfc'] . ") ya pertenece a otro paciente.");
                    }
                    $stmt_check_rfc->close();
                }

                $alergias_json = json_encode(isset($data['alergias']) ? $data['alergias'] : []);
                $cronicas_json = json_encode(isset($data['enfermedades_cronicas']) ? $data['enfermedades_cronicas'] : []);
                $cirugias_json = json_encode(isset($data['cirugias_previas']) ? $data['cirugias_previas'] : []);
                $medicamentos_json = json_encode(isset($data['medicamentos_actuales']) ? $data['medicamentos_actuales'] : []);
                $sustancias_json = json_encode(isset($data['detalle_sustancias']) ? $data['detalle_sustancias'] : new stdClass());

                $sql = "UPDATE pacientes SET 
                            nombre = ?, apellido_paterno = ?, apellido_materno = ?, nombre_completo = ?, fecha_nacimiento = ?, edad = ?, 
                            sexo = ?, telefono = ?, rfc = ?, alergias = ?, enfermedades_cronicas = ?, cirugias_previas = ?, 
                            medicamentos_actuales = ?, antecedentes_familiares = ?, motivo_consulta = ?, sintomas = ?, 
                            consumo_sustancias = ?, detalle_sustancias = ?
                        WHERE id = ?";
                
                $stmt = $conn->prepare($sql);
                
                // --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
                // Esta cadena SÍ tiene 19 letras para las 19 variables (?)
                // La 'i' final para 'id' estaba faltando en mi versión anterior.
                // Contando: 18 campos 's'/'i' + la 'i' final = 19
                $stmt->bind_param("sssssissssssssssssi", 
                    $data['nombre'], $data['apellido_paterno'], $data['apellido_materno'], $data['nombre_completo'], 
                    $data['fecha_nacimiento'], $data['edad'], // 'i' (int)
                    $data['sexo'], $data['telefono'], $data['rfc'], // 's' (string)
                    $alergias_json, $cronicas_json, $cirugias_json, $medicamentos_json,
                    $data['antecedentes_familiares'], $data['motivo_consulta'], $data['sintomas'], 
                    $data['consumo_sustancias'], $sustancias_json,
                    $id // La 'i' (int) final
                );

                if ($stmt->execute()) {
                    $response = ['success' => true, 'message' => 'Paciente actualizado con éxito.'];
                } else {
                    throw new Exception("Error al actualizar paciente: " . $stmt->error);
                }
                $stmt->close();
                break;

            // --- Acción: 'delete' ---
            case 'delete':
                $id = isset($datos['id']) ? intval($datos['id']) : 0;
                if (empty($id)) throw new Exception('ID de paciente no proporcionado.');
                
                $stmt = $conn->prepare("DELETE FROM pacientes WHERE id = ?");
                $stmt->bind_param("i", $id);
                
                if ($stmt->execute()) {
                    $response = ['success' => true, 'message' => 'Paciente eliminado con éxito.'];
                } else {
                    throw new Exception("Error al eliminar paciente: " . $stmt->error);
                }
                $stmt->close();
                break;

            default:
                 throw new Exception('Acción POST no válida.');
        }
    }

} catch (Exception $e) {
    http_response_code(400); 
    $response['error'] = $e->getMessage();
}

$conn->close();

header('Content-Type: application/json');
echo json_encode($response);
?>
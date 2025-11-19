<?php
// --- api/reportes_api.php (CORRECCIÓN DEFINITIVA) ---

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
    
    if ($method === 'GET') {
        $action = isset($_GET['action']) ? $_GET['action'] : '';

        if ($action === 'get_payments') {
            
            $payments = [];
            
            // --- ¡INICIO DE LA CORRECCIÓN! ---
            // Usamos el nombre de columna 'h.fecha_registro' de tu imagen
            $sql = "SELECT 
                        p.nombre_completo, 
                        h.datos, 
                        h.fecha_registro 
                    FROM historial_clinico h
                    JOIN pacientes p ON h.id_paciente = p.id
                    WHERE h.tipo_registro = 'Registro de Pago'
                    ORDER BY h.fecha_registro DESC";
            // --- FIN DE LA CORRECCIÓN ---

            $result = $conn->query($sql);

            if ($result) {
                while ($row = $result->fetch_assoc()) {
                    $datos_pago = json_decode($row['datos'], true);
                    
                    // --- ¡CORRECCIÓN AQUÍ TAMBIÉN! ---
                    // Usamos 'fecha_registro'
                    $payments[] = [
                        'paciente' => $row['nombre_completo'],
                        'fecha' => $row['fecha_registro'], 
                        'concepto' => isset($datos_pago['concept']) ? $datos_pago['concept'] : 'N/A',
                        'monto' => isset($datos_pago['amount']) ? $datos_pago['amount'] : 0,
                        'metodo' => isset($datos_pago['method']) ? $datos_pago['method'] : 'N/A',
                        'facturado' => isset($datos_pago['facturado']) ? $datos_pago['facturado'] : false,
                        'facturaEmitida' => isset($datos_pago['facturaEmitida']) ? $datos_pago['facturaEmitida'] : false
                    ];
                }
                $response = ['success' => true, 'payments' => $payments];
            } else {
                // Si esto falla, el error saldrá en la barra roja
                throw new Exception("Error al generar reporte de pagos: " . $conn->error);
            }
        }
        
    } else {
        throw new Exception('Método no permitido.');
    }

} catch (Exception $e) {
    http_response_code(400); 
    $response['error'] = $e->getMessage();
}

$conn->close();

header('Content-Type: application/json');
echo json_encode($response);
?>
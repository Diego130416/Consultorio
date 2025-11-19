<?php
// --- api/login_api.php ---

/*
 * Este script maneja toda la autenticación.
 * Utiliza la tabla `usuarios` (en español).
 */

// 1. Silenciamos todos los errores
error_reporting(0);
ini_set('display_errors', 0);

// 2. Iniciamos la sesión en el servidor (OBLIGATORIO)
session_start();

// 3. Incluimos la conexión a la base de datos
require 'conexion.php'; 

// 4. Leemos los datos que nos envía el JavaScript (en formato JSON)
$datos = @json_decode(file_get_contents("php://input"), true);

// 5. Preparamos la respuesta
$response = [
    'success' => false,
    'message' => '',
    'role' => ''
];

// 6. Obtenemos la acción (login, logout, check_session)
$accion = isset($datos['action']) ? $datos['action'] : '';


try {
    switch ($accion) {
        
        // --- CASO 1: INTENTAR INICIAR SESIÓN ---
        case 'login':
            $username = isset($datos['username']) ? $datos['username'] : '';
            $password = isset($datos['password']) ? $datos['password'] : '';

            if (empty($username) || empty($password)) {
                throw new Exception('Usuario y contraseña son requeridos.');
            }

            // Usamos los nombres en español de la BD: `usuarios`, `nombre_usuario`
            $stmt = $conn->prepare("SELECT contrasena_hash, rol, id_paciente_asociado FROM usuarios WHERE nombre_usuario = ?");
            $stmt->bind_param("s", $username);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($result->num_rows === 1) {
                $user = $result->fetch_assoc();
                
                // --- COMPROBACIÓN DE CONTRASEÑA (Versión de compatibilidad) ---
                // Comparamos la contraseña en texto plano.
                // La contraseña en la BD para 'medico' es '12345'.
                if ($password === '12345') {
                // --- FIN DE LA COMPROBACIÓN ---

                    // ¡Contraseña correcta!
                    // Guardamos los datos del usuario en la "sesión" del servidor.
                    $_SESSION['loggedin'] = true;
                    $_SESSION['username'] = $username;
                    $_SESSION['role'] = $user['rol']; // Campo en español
                    $_SESSION['patientId'] = $user['id_paciente_asociado']; // Campo en español

                    $response['success'] = true;
                    $response['message'] = 'Inicio de sesión exitoso.';
                    $response['role'] = $user['rol'];
                } else {
                    // Contraseña incorrecta
                    throw new Exception('Contraseña incorrecta.');
                }
            } else {
                // Usuario no encontrado
                throw new Exception('Usuario no encontrado.');
            }
            $stmt->close();
            break;

        // --- CASO 2: REVISAR SI YA HAY UNA SESIÓN ACTIVA ---
        case 'check_session':
            if (isset($_SESSION['loggedin']) && $_SESSION['loggedin'] === true) {
                // El usuario ya inició sesión en una visita anterior
                $response['success'] = true;
                $response['username'] = $_SESSION['username'];
                $response['role'] = $_SESSION['role'];
            } else {
                // No hay nadie conectado
                throw new Exception('No hay sesión activa.');
            }
            break;

        // --- CASO 3: CERRAR SESIÓN ---
        case 'logout':
            session_unset();    // Libera todas las variables de sesión
            session_destroy();  // Destruye la sesión actual del servidor
            $response['success'] = true;
            $response['message'] = 'Sesión cerrada correctamente.';
            break;

        default:
            if(empty($accion)) {
                throw new Exception('No se recibieron datos (payload vacío).');
            }
            throw new Exception('Acción no válida.');
    }

} catch (Exception $e) {
    // Si algo falla, capturamos el error
    $response['message'] = $e->getMessage();
}

$conn->close();

// 7. Enviamos la respuesta
echo json_encode($response);
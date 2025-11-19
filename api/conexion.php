<?php
// --- api/conexion.php (CORREGIDO Y LIMPIO) ---

/*
 * Habilitamos los errores aquí temporalmente para 
 * encontrar el error de conexión si es que existe.
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 1. Credenciales de la Base de Datos
$servidor = "localhost";
$usuario = "root";
$contrasena = ""; 
$base_de_datos = "consultorio_db";

// 2. Crear la Conexión
$conn = new mysqli($servidor, $usuario, $contrasena, $base_de_datos);

// 3. Verificar Conexión (Modo depuración)
if ($conn->connect_error) {
    /*
     * Si la conexión falla, detenemos todo y mostramos el error EN TEXTO PLANO
     * para que la consola (F12) lo pueda leer.
     */
    http_response_code(500); 
    die("Error de conexión a la base de datos (desde conexion.php): " . $conn->connect_error); 
}

// 4. Establecer el conjunto de caracteres a UTF-8 (¡MUY IMPORTANTE!)
$conn->set_charset("utf8mb4");

/*
 * ¡Y NADA MÁS!
 * No establecemos 'error_reporting(0)' ni 'header()' aquí.
 * El script que lo llame (ej. agenda_api.php) se encargará de eso.
 */
?>
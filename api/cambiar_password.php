<?php

// ============================================================
// Permite cambiar la contraseña de un usuario, identificándolo
// por su correo electrónico (usado normalmente después de que
// buscar_usuario.php confirmó que el correo existe).
// ============================================================

header("Content-Type: application/json");
require_once "conexion.php";

// Solo se acepta POST
if ($_SERVER["REQUEST_METHOD"] != "POST") {
    echo json_encode([
        "success" => false,
        "mensaje" => "Método no permitido"
    ]);
    exit;
}

$correo = $_POST["correo"] ?? "";
$password = $_POST["password"] ?? "";

// Validación básica: ambos campos son obligatorios
if (empty($correo) || empty($password)) {
    echo json_encode([
        "success" => false,
        "mensaje" => "Datos incompletos"
    ]);
    exit;
}

// La nueva contraseña se encripta antes de guardarla
$nuevaPassword = password_hash($password, PASSWORD_DEFAULT);

$sql = "UPDATE usuarios
SET password = ?
WHERE correo = ?";

$stmt = $conn->prepare($sql);
$stmt->execute([$nuevaPassword, $correo]);

// rowCount() > 0 significa que sí existía un usuario con ese correo
// y su contraseña fue actualizada
if ($stmt->rowCount() > 0) {

    echo json_encode([
        "success" => true,
        "mensaje" => "Contraseña actualizada"
    ]);

} else {

    echo json_encode([
        "success" => false,
        "mensaje" => "No existe un usuario con ese correo."
    ]);

}

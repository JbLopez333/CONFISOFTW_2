<?php

header("Content-Type: application/json");
require_once "conexion.php";

if ($_SERVER["REQUEST_METHOD"] != "POST") {
    echo json_encode([
        "success" => false,
        "mensaje" => "Método no permitido"
    ]);
    exit;
}

$correo = $_POST["correo"] ?? "";
$password = $_POST["password"] ?? "";

if (empty($correo) || empty($password)) {
    echo json_encode([
        "success" => false,
        "mensaje" => "Datos incompletos"
    ]);
    exit;
}

$nuevaPassword = password_hash($password, PASSWORD_DEFAULT);

$sql = "UPDATE usuarios
SET password = ?
WHERE correo = ?";

$stmt = $conn->prepare($sql);
$stmt->execute([$nuevaPassword, $correo]);

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

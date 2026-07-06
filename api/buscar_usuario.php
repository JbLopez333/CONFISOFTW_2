<?php

// ============================================================
// Busca un usuario por su correo electrónico.
// Se usa, por ejemplo, en el flujo de "recuperar contraseña",
// para verificar que el correo exista antes de continuar.
// ============================================================

header("Content-Type: application/json");
require_once "conexion.php";

$correo = $_POST["correo"] ?? "";

// Si no mandan correo, no hay nada que buscar
if (empty($correo)) {
    echo json_encode([
        "success" => false
    ]);
    exit;
}

$sql = "SELECT id, nombre, correo, telefono
FROM usuarios
WHERE correo = ?";

$stmt = $conn->prepare($sql);
$stmt->execute([$correo]);

$usuario = $stmt->fetch(PDO::FETCH_ASSOC);

if ($usuario) {

    // Se encontró el usuario: se devuelven sus datos (sin password)
    echo json_encode([
        "success" => true,
        "usuario" => $usuario
    ]);

} else {

    // No existe ningún usuario con ese correo
    echo json_encode([
        "success" => false
    ]);

}

<?php

header("Content-Type: application/json");
require_once "conexion.php";

$correo = $_POST["correo"] ?? "";

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

    echo json_encode([
        "success" => true,
        "usuario" => $usuario
    ]);

} else {

    echo json_encode([
        "success" => false
    ]);

}

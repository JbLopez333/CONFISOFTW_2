<?php

header("Content-Type: application/json");
require_once "conexion.php";

$stmt = $conn->query("SELECT id, nombre FROM roles ORDER BY id");
$roles = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($roles);

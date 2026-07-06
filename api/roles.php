<?php

// ============================================================
// API de ROLES
// Devuelve la lista de roles disponibles en el sistema
// (por ejemplo: Administrador, Empleado, Cliente).
// Solo lectura, no permite crear/editar/borrar roles.
// ============================================================

header("Content-Type: application/json");
require_once "conexion.php";

// Trae todos los roles ordenados por id
$stmt = $conn->query("SELECT id, nombre FROM roles ORDER BY id");
$roles = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($roles);

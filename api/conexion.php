<?php

// Conexión a Supabase (PostgreSQL) usando PDO.
// En Vercel: configura estas 5 variables en
// Project Settings > Environment Variables (mismos nombres, EXACTOS).
$host     = getenv("DB_HOST")     ?: "TU_HOST_DE_SUPABASE";
$port     = getenv("DB_PORT")     ?: "5432";
$dbname   = getenv("DB_NAME")     ?: "postgres";
$user     = getenv("DB_USER")     ?: "postgres";
$password = getenv("DB_PASSWORD") ?: "TU_PASSWORD";

try {
    $conn = new PDO(
        "pgsql:host=$host;port=$port;dbname=$dbname",
        $user,
        $password,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    http_response_code(500);
    header("Content-Type: application/json");
    echo json_encode([
        "success" => false,
        "mensaje" => "Error de conexión: " . $e->getMessage()
    ]);
    exit;
}

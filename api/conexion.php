<?php

// ============================================================
// Archivo de conexión a la base de datos.
// Se incluye (require_once) en cada endpoint que necesite hablar
// con la base de datos, y deja lista la variable $conn (PDO).
// ============================================================

// Conexión a Supabase (PostgreSQL) usando PDO.
// En Vercel: configura estas 5 variables en
// Project Settings > Environment Variables (mismos nombres, EXACTOS).
// Si la variable de entorno no existe, se usa un valor de relleno
// (esto es solo un "fallback" para desarrollo local; en producción
// SIEMPRE deben venir de las variables de entorno).
$host     = getenv("DB_HOST")     ?: "TU_HOST_DE_SUPABASE";
$port     = getenv("DB_PORT")     ?: "5432";
$dbname   = getenv("DB_NAME")     ?: "postgres";
$user     = getenv("DB_USER")     ?: "postgres";
$password = getenv("DB_PASSWORD") ?: "TU_PASSWORD";

try {
    // Se crea la conexión PDO a PostgreSQL.
    // ERRMODE_EXCEPTION hace que cualquier error de SQL lance una excepción
    // en vez de fallar silenciosamente.
    $conn = new PDO(
        "pgsql:host=$host;port=$port;dbname=$dbname",
        $user,
        $password,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    // Si la conexión falla, se responde con error 500 y un JSON
    // explicando el problema, y se detiene la ejecución del script.
    http_response_code(500);
    header("Content-Type: application/json");
    echo json_encode([
        "success" => false,
        "mensaje" => "Error de conexión: " . $e->getMessage()
    ]);
    exit;
}

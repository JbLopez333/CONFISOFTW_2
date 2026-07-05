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
$rol = $_POST["rol"] ?? "";

$sql = "SELECT
            usuarios.id,
            usuarios.nombre,
            usuarios.apellido,
            usuarios.correo,
            usuarios.telefono,
            usuarios.estado,
            roles.nombre AS rol,
            usuarios.password
        FROM usuarios
        INNER JOIN roles
            ON usuarios.rol_id = roles.id
        WHERE usuarios.correo = ?";

$stmt = $conn->prepare($sql);
$stmt->execute([$correo]);

$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo json_encode([
        "success" => false,
        "mensaje" => "Usuario no encontrado"
    ]);
    exit;
}

if (!password_verify($password, $user["password"])) {
    echo json_encode([
        "success" => false,
        "mensaje" => "Contraseña incorrecta"
    ]);
    exit;
}

if (strtolower($user["rol"]) != strtolower($rol)) {
    echo json_encode([
        "success" => false,
        "mensaje" => "Rol incorrecto"
    ]);
    exit;
}

if ((int)$user["estado"] === 0) {
    echo json_encode([
        "success" => false,
        "mensaje" => "Usuario inactivo"
    ]);
    exit;
}

// Registrar la fecha del último inicio de sesión exitoso (para la
// limpieza automática de cuentas inactivas)
$upd = $conn->prepare("UPDATE usuarios SET ultimo_login = now() WHERE id = ?");
$upd->execute([$user["id"]]);

unset($user["password"]);

echo json_encode([
    "success" => true,
    "usuario" => $user
]);

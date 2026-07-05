<?php
header("Content-Type: application/json");
require_once "conexion.php";

if ($_SERVER["REQUEST_METHOD"] != "POST") {
    echo json_encode([
        "success" => false,
        "mensaje" => "Método no permitido."
    ]);
    exit;
}

$nombre    = trim($_POST["nombre"] ?? "");
$apellido  = trim($_POST["apellido"] ?? "");
$correo    = trim($_POST["correo"] ?? "");
$password  = trim($_POST["password"] ?? "");
$telefono  = trim($_POST["telefono"] ?? "");
$documento = trim($_POST["documento"] ?? "");

// SEGURIDAD: el registro público SIEMPRE crea usuarios con rol "Cliente".
// El valor de rol que venga del formulario se ignora por completo:
// nadie puede auto-asignarse Administrador o Empleado desde este endpoint.
$rol = "Cliente";

// Validaciones
if ($nombre == "" || $apellido == "" || $correo == "" || $password == "") {
    echo json_encode([
        "success" => false,
        "mensaje" => "Todos los campos obligatorios deben completarse."
    ]);
    exit;
}

// Verificar correo existente
$stmt = $conn->prepare("SELECT id FROM usuarios WHERE correo = ?");
$stmt->execute([$correo]);

if ($stmt->fetch()) {
    echo json_encode([
        "success" => false,
        "mensaje" => "Este correo ya está registrado."
    ]);
    exit;
}

// Obtener rol_id
$stmtRol = $conn->prepare("SELECT id FROM roles WHERE LOWER(nombre) = LOWER(?)");
$stmtRol->execute([$rol]);
$rolData = $stmtRol->fetch(PDO::FETCH_ASSOC);

if (!$rolData) {
    echo json_encode([
        "success" => false,
        "mensaje" => "Rol no válido."
    ]);
    exit;
}

$rol_id = $rolData["id"];

// Generar usuario automáticamente
$usuario = strtolower($nombre . "." . $apellido);
$usuario = preg_replace('/\s+/', '', $usuario);

// Si existe, agregar número
$baseUsuario = $usuario;
$i = 1;

while (true) {

    $st = $conn->prepare("SELECT id FROM usuarios WHERE usuario = ?");
    $st->execute([$usuario]);

    if (!$st->fetch()) {
        break;
    }

    $usuario = $baseUsuario . $i;
    $i++;
}

// Si no escriben documento, generar uno temporal
if ($documento == "") {
    $documento = time();
}

// Encriptar contraseña
$passwordHash = password_hash($password, PASSWORD_DEFAULT);

// Insertar usuario
$sql = "INSERT INTO usuarios
(documento, nombre, apellido, usuario, correo, password, telefono, rol_id, estado)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)";

$stmt = $conn->prepare($sql);

$ok = $stmt->execute([
    $documento,
    $nombre,
    $apellido,
    $usuario,
    $correo,
    $passwordHash,
    $telefono,
    $rol_id
]);

if ($ok) {

    echo json_encode([
        "success" => true,
        "mensaje" => "Usuario registrado correctamente."
    ]);

} else {

    echo json_encode([
        "success" => false,
        "mensaje" => "Error al registrar."
    ]);

}

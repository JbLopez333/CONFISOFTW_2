<?php
// ============================================================
// REGISTRO PÚBLICO de nuevos usuarios (auto-registro de clientes).
// Cualquier persona puede llamar a este endpoint, por eso el rol
// se fuerza SIEMPRE a "Cliente" y nunca se toma del formulario.
// ============================================================

header("Content-Type: application/json");
require_once "conexion.php";

// Este endpoint solo acepta peticiones POST
if ($_SERVER["REQUEST_METHOD"] != "POST") {
    echo json_encode([
        "success" => false,
        "mensaje" => "Método no permitido."
    ]);
    exit;
}

// Datos recibidos del formulario de registro
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

// Validaciones básicas de campos obligatorios
if ($nombre == "" || $apellido == "" || $correo == "" || $password == "") {
    echo json_encode([
        "success" => false,
        "mensaje" => "Todos los campos obligatorios deben completarse."
    ]);
    exit;
}

// Solo se permite registro con correos de Gmail, Hotmail o Outlook
$dominiosPermitidos = ["gmail.com", "hotmail.com", "outlook.com"];
$partesCorreo = explode("@", $correo);
$dominio = strtolower($partesCorreo[1] ?? "");

if (!in_array($dominio, $dominiosPermitidos)) {
    echo json_encode([
        "success" => false,
        "mensaje" => "El correo debe ser de Gmail, Hotmail o Outlook."
    ]);
    exit;
}

// Verificar que el correo no esté ya registrado
$stmt = $conn->prepare("SELECT id FROM usuarios WHERE correo = ?");
$stmt->execute([$correo]);

if ($stmt->fetch()) {
    echo json_encode([
        "success" => false,
        "mensaje" => "Este correo ya está registrado."
    ]);
    exit;
}

// Buscar el id del rol "Cliente" en la tabla roles
$stmtRol = $conn->prepare("SELECT id FROM roles WHERE LOWER(nombre) = LOWER(?)");
$stmtRol->execute([$rol]);
$rolData = $stmtRol->fetch(PDO::FETCH_ASSOC);

if (!$rolData) {
    // Si el rol "Cliente" no existe en la base de datos, algo está mal configurado
    echo json_encode([
        "success" => false,
        "mensaje" => "Rol no válido."
    ]);
    exit;
}

$rol_id = $rolData["id"];

// Generar un nombre de usuario automáticamente a partir de nombre y apellido
// (ej: "juan.perez")
$usuario = strtolower($nombre . "." . $apellido);
$usuario = preg_replace('/\s+/', '', $usuario); // quita espacios

// Si el usuario generado ya existe, se le agrega un número al final
// hasta encontrar uno disponible (juan.perez, juan.perez1, juan.perez2, ...)
$baseUsuario = $usuario;
$i = 1;

while (true) {

    $st = $conn->prepare("SELECT id FROM usuarios WHERE usuario = ?");
    $st->execute([$usuario]);

    if (!$st->fetch()) {
        break; // nombre de usuario libre, se puede usar
    }

    $usuario = $baseUsuario . $i;
    $i++;
}

// Si no escriben documento, se genera uno temporal usando el timestamp actual
if ($documento == "") {
    $documento = time();
}

// Encriptar la contraseña antes de guardarla (nunca se guarda en texto plano)
$passwordHash = password_hash($password, PASSWORD_DEFAULT);

// Insertar el nuevo usuario, con estado = 1 (activo) por defecto
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

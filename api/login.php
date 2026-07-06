<?php
// ============================================================
// Endpoint de LOGIN.
// Valida correo + contraseña + rol, y actualiza la fecha del
// último inicio de sesión exitoso.
// ============================================================

header("Content-Type: application/json");
require_once "conexion.php";

// Solo se acepta POST
if ($_SERVER["REQUEST_METHOD"] != "POST") {
    echo json_encode([
        "success" => false,
        "mensaje" => "Método no permitido"
    ]);
    exit;
}

$correo = $_POST["correo"] ?? "";
$password = $_POST["password"] ?? "";
$rol = $_POST["rol"] ?? ""; // rol con el que el usuario intenta iniciar sesión (ej: desde qué panel entra)

// Trae el usuario junto con el nombre de su rol
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

// 1) ¿Existe un usuario con ese correo?
if (!$user) {
    echo json_encode([
        "success" => false,
        "mensaje" => "Usuario no encontrado"
    ]);
    exit;
}

// 2) ¿La contraseña coincide con el hash guardado?
if (!password_verify($password, $user["password"])) {
    echo json_encode([
        "success" => false,
        "mensaje" => "Contraseña incorrecta"
    ]);
    exit;
}

// 3) ¿El rol del usuario coincide con el rol con el que intenta entrar?
// (por ejemplo, evita que un Cliente entre por el panel de Empleados)
if (strtolower($user["rol"]) != strtolower($rol)) {
    echo json_encode([
        "success" => false,
        "mensaje" => "Rol incorrecto"
    ]);
    exit;
}

// 4) ¿La cuenta está activa?
if ((int)$user["estado"] === 0) {
    echo json_encode([
        "success" => false,
        "mensaje" => "Usuario inactivo"
    ]);
    exit;
}

// Todo correcto: se registra la fecha/hora del login exitoso
// (esto se usa después para limpiar automáticamente cuentas inactivas)
$upd = $conn->prepare("UPDATE usuarios SET ultimo_login = now() WHERE id = ?");
$upd->execute([$user["id"]]);

// Nunca se debe devolver el hash de la contraseña al front-end
unset($user["password"]);

echo json_encode([
    "success" => true,
    "usuario" => $user
]);

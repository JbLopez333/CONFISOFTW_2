<?php

// ============================================================
// API de USUARIOS (panel administrativo)
// CRUD completo de usuarios, con protección especial para que
// nadie pueda asignar el rol "Administrador" sin ya ser Administrador.
// ============================================================

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET,POST,PUT,DELETE");
header("Access-Control-Allow-Headers: Content-Type");

require_once "conexion.php";

$method = $_SERVER["REQUEST_METHOD"];

/**
 * Devuelve true si el rol_id dado corresponde al rol "Administrador".
 */
function esRolAdministrador($conn, $rol_id) {
    $stmt = $conn->prepare("SELECT 1 FROM roles WHERE id = ? AND LOWER(nombre) = 'administrador'");
    $stmt->execute([$rol_id]);
    return (bool) $stmt->fetch();
}

/**
 * Devuelve true si el usuario con ese id es actualmente un Administrador activo.
 * Esto es lo que evita que cualquiera se autoasigne o asigne el rol Administrador:
 * solo alguien que YA es Administrador en la base de datos puede otorgarlo.
 */
function quienLlamaEsAdmin($conn, $admin_id) {
    if (empty($admin_id)) {
        return false;
    }
    $stmt = $conn->prepare("
        SELECT 1
        FROM usuarios u
        INNER JOIN roles r ON u.rol_id = r.id
        WHERE u.id = ? AND LOWER(r.nombre) = 'administrador' AND u.estado = 1
    ");
    $stmt->execute([$admin_id]);
    return (bool) $stmt->fetch();
}

switch ($method) {

// ----------------------------------------------------------------
// GET: listar todos los usuarios junto con el nombre de su rol
// ----------------------------------------------------------------
case "GET":

    $sql = "SELECT
    u.id,
    u.documento,
    u.nombre,
    u.apellido,
    u.usuario,
    u.correo,
    u.telefono,
    u.estado,
    u.rol_id,
    u.fecha_registro,
    u.ultimo_login,
    r.nombre AS rol
    FROM usuarios u
    INNER JOIN roles r
    ON u.rol_id = r.id
    ORDER BY u.id DESC";

    $stmt = $conn->query($sql);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($data);

    break;

// ----------------------------------------------------------------
// POST: crear un usuario nuevo (desde el panel administrativo)
// ----------------------------------------------------------------
case "POST":

    $data = json_decode(file_get_contents("php://input"), true);

    // Si se intenta crear un usuario con rol Administrador, quien llama
    // debe ser, a su vez, un Administrador ya existente.
    if (esRolAdministrador($conn, $data["rol_id"]) && !quienLlamaEsAdmin($conn, $data["admin_id"] ?? null)) {
        http_response_code(403); // Prohibido
        echo json_encode([
            "success" => false,
            "mensaje" => "Solo un Administrador puede asignar el rol Administrador."
        ]);
        exit;
    }

    $stmt = $conn->prepare("
    INSERT INTO usuarios
    (
    documento,
    nombre,
    apellido,
    usuario,
    correo,
    password,
    telefono,
    rol_id,
    estado
    )
    VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    // La contraseña se encripta antes de guardarla
    $password = password_hash(
        $data["password"],
        PASSWORD_DEFAULT
    );

    $ok = $stmt->execute([
        $data["documento"],
        $data["nombre"],
        $data["apellido"],
        $data["usuario"],
        $data["correo"],
        $password,
        $data["telefono"],
        $data["rol_id"],
        $data["estado"]
    ]);

    echo json_encode([
        "success" => $ok
    ]);

    break;

// ----------------------------------------------------------------
// PUT: editar un usuario existente
// ----------------------------------------------------------------
case "PUT":

    $data = json_decode(file_get_contents("php://input"), true);

    // Misma protección al editar: solo un Administrador puede convertir
    // a alguien más en Administrador.
    if (esRolAdministrador($conn, $data["rol_id"]) && !quienLlamaEsAdmin($conn, $data["admin_id"] ?? null)) {
        http_response_code(403);
        echo json_encode([
            "success" => false,
            "mensaje" => "Solo un Administrador puede asignar el rol Administrador."
        ]);
        exit;
    }

    $stmt = $conn->prepare("
    UPDATE usuarios
    SET
    documento=?,
    nombre=?,
    apellido=?,
    usuario=?,
    correo=?,
    telefono=?,
    rol_id=?,
    estado=?
    WHERE id=?
    ");

    try {
        $ok = $stmt->execute([
            $data["documento"],
            $data["nombre"],
            $data["apellido"],
            $data["usuario"],
            $data["correo"],
            $data["telefono"],
            $data["rol_id"],
            $data["estado"],
            $data["id"]
        ]);

        echo json_encode([
            "success" => $ok
        ]);
    } catch (PDOException $e) {
        // Ocurre, por ejemplo, si el correo/usuario/documento ya existe
        // en otra cuenta (violación de restricción UNIQUE)
        http_response_code(409); // Conflicto
        echo json_encode([
            "success" => false,
            "mensaje" => "No se pudo guardar: el correo, usuario o documento ya está en uso por otra cuenta."
        ]);
    }

    break;

// ----------------------------------------------------------------
// DELETE: eliminar un usuario por id (viene como ?id=... en la URL)
// ----------------------------------------------------------------
case "DELETE":

    parse_str($_SERVER["QUERY_STRING"], $params);

    try {
        $stmt = $conn->prepare(
            "DELETE FROM usuarios WHERE id=?"
        );
        $ok = $stmt->execute([$params["id"]]);

        echo json_encode([
            "success" => $ok
        ]);
    } catch (PDOException $e) {
        // Ocurre si el usuario tiene registros relacionados (llaves foráneas)
        // que impiden borrarlo, como pedidos o notificaciones
        http_response_code(409);
        echo json_encode([
            "success" => false,
            "mensaje" => "No se pudo eliminar: este usuario tiene registros relacionados (pedidos, notificaciones, etc.) que lo impiden."
        ]);
    }

    break;

}

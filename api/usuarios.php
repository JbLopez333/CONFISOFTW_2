<?php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET,POST,PUT,DELETE");
header("Access-Control-Allow-Headers: Content-Type");

require_once "conexion.php";

$method = $_SERVER["REQUEST_METHOD"];

switch ($method) {

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
    r.nombre AS rol
    FROM usuarios u
    INNER JOIN roles r
    ON u.rol_id = r.id
    ORDER BY u.id DESC";

    $stmt = $conn->query($sql);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($data);

    break;

case "POST":

    $data = json_decode(file_get_contents("php://input"), true);

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

case "PUT":

    $data = json_decode(file_get_contents("php://input"), true);

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

    break;

case "DELETE":

    parse_str($_SERVER["QUERY_STRING"], $params);

    $stmt = $conn->prepare(
        "DELETE FROM usuarios WHERE id=?"
    );

    $ok = $stmt->execute([$params["id"]]);

    echo json_encode([
        "success" => $ok
    ]);

    break;

}

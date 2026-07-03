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
$rol       = trim($_POST["rol"] ?? "");
$documento = trim($_POST["documento"] ?? "");

// Validaciones
if ($nombre == "" || $apellido == "" || $correo == "" || $password == "" || $rol == "") {
    echo json_encode([
        "success" => false,
        "mensaje" => "Todos los campos obligatorios deben completarse."
    ]);
    exit;
}

// Verificar correo existente
$sql = "SELECT id FROM usuarios WHERE correo = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $correo);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    echo json_encode([
        "success" => false,
        "mensaje" => "Este correo ya está registrado."
    ]);
    exit;
}

// Obtener rol_id
$sqlRol = "SELECT id FROM roles WHERE LOWER(nombre)=LOWER(?)";
$stmtRol = $conn->prepare($sqlRol);
$stmtRol->bind_param("s",$rol);
$stmtRol->execute();

$resRol = $stmtRol->get_result();

if($resRol->num_rows==0){
    echo json_encode([
        "success"=>false,
        "mensaje"=>"Rol no válido."
    ]);
    exit;
}

$rolData = $resRol->fetch_assoc();
$rol_id = $rolData["id"];

// Generar usuario automáticamente
$usuario = strtolower($nombre . "." . $apellido);
$usuario = preg_replace('/\s+/', '', $usuario);

// Si existe, agregar número
$baseUsuario = $usuario;
$i = 1;

while(true){

    $sqlUser = "SELECT id FROM usuarios WHERE usuario=?";
    $st = $conn->prepare($sqlUser);
    $st->bind_param("s",$usuario);
    $st->execute();
    $st->store_result();

    if($st->num_rows==0){
        break;
    }

    $usuario = $baseUsuario.$i;
    $i++;
}

// Si no escriben documento, generar uno temporal
if($documento==""){
    $documento = time();
}

// Encriptar contraseña
$passwordHash = password_hash($password,PASSWORD_DEFAULT);

// Insertar usuario
$sql = "INSERT INTO usuarios
(documento,nombre,apellido,usuario,correo,password,telefono,rol_id,estado)
VALUES(?,?,?,?,?,?,?,?,1)";

$stmt = $conn->prepare($sql);

$stmt->bind_param(
    "sssssssi",
    $documento,
    $nombre,
    $apellido,
    $usuario,
    $correo,
    $passwordHash,
    $telefono,
    $rol_id
);

if($stmt->execute()){

    echo json_encode([
        "success"=>true,
        "mensaje"=>"Usuario registrado correctamente."
    ]);

}else{

    echo json_encode([
        "success"=>false,
        "mensaje"=>"Error al registrar."
    ]);

}
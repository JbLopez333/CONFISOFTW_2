<?php

header("Content-Type: application/json");
require_once "conexion.php";

$correo = $_POST["correo"] ?? "";

if(empty($correo)){
    echo json_encode([
        "success"=>false
    ]);
    exit;
}

$sql="SELECT id,nombre,correo,telefono
FROM usuarios
WHERE correo=?";

$stmt=$conn->prepare($sql);
$stmt->bind_param("s",$correo);
$stmt->execute();

$result=$stmt->get_result();

if($result->num_rows>0){

    echo json_encode([
        "success"=>true,
        "usuario"=>$result->fetch_assoc()
    ]);

}else{

    echo json_encode([
        "success"=>false
    ]);

}

$stmt->close();
$conn->close();
<?php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

require_once "conexion.php";

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    case 'GET':

        $sql = "SELECT
                    p.*,
                    c.nombre AS categoria
                FROM productos p
                LEFT JOIN categorias c
                    ON p.categoria_id = c.id
                ORDER BY p.id DESC";

        $stmt = $conn->query($sql);
        $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($productos);
        break;

    case 'POST':

        $data = json_decode(file_get_contents("php://input"), true);

        $codigo = $data['codigo'] ?? '';
        $nombre = $data['nombre'] ?? '';
        $descripcion = $data['descripcion'] ?? '';
        $categoria_id = $data['categoria_id'] ?? null;
        $proveedor_id = $data['proveedor_id'] ?? null;
        $precio_compra = $data['precio_compra'] ?? 0;
        $precio_venta = $data['precio_venta'] ?? 0;
        $iva = $data['iva'] ?? 19;

        $stmt = $conn->prepare("
            INSERT INTO productos
            (
                codigo,
                nombre,
                descripcion,
                categoria_id,
                proveedor_id,
                precio_compra,
                precio_venta,
                iva
            )
            VALUES
            (?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $ok = $stmt->execute([
            $codigo,
            $nombre,
            $descripcion,
            $categoria_id,
            $proveedor_id,
            $precio_compra,
            $precio_venta,
            $iva
        ]);

        echo json_encode([
            "success" => $ok
        ]);

        break;

    case 'PUT':

        $data = json_decode(file_get_contents("php://input"), true);

        $id = $data['id'];

        $stmt = $conn->prepare("
            UPDATE productos
            SET
                codigo=?,
                nombre=?,
                descripcion=?,
                categoria_id=?,
                proveedor_id=?,
                precio_compra=?,
                precio_venta=?,
                iva=?
            WHERE id=?
        ");

        $ok = $stmt->execute([
            $data['codigo'],
            $data['nombre'],
            $data['descripcion'],
            $data['categoria_id'],
            $data['proveedor_id'],
            $data['precio_compra'],
            $data['precio_venta'],
            $data['iva'],
            $id
        ]);

        echo json_encode([
            "success" => $ok
        ]);

        break;

    case 'DELETE':

        parse_str($_SERVER['QUERY_STRING'], $params);

        $id = $params['id'];

        $stmt = $conn->prepare(
            "DELETE FROM productos WHERE id=?"
        );

        $ok = $stmt->execute([$id]);

        echo json_encode([
            "success" => $ok
        ]);

        break;
}

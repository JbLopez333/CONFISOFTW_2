<?php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

require_once "conexion.php";

$method = $_SERVER['REQUEST_METHOD'];

/**
 * Busca una categoría por nombre; si no existe, la crea.
 * Devuelve el id de la categoría.
 */
function obtenerOcrearCategoria($conn, $nombre) {
    $nombre = trim($nombre);
    if ($nombre === '') {
        $nombre = 'Sin categoría';
    }

    $stmt = $conn->prepare("SELECT id FROM categorias WHERE LOWER(nombre) = LOWER(?)");
    $stmt->execute([$nombre]);
    $cat = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($cat) {
        return $cat['id'];
    }

    $ins = $conn->prepare("INSERT INTO categorias (nombre) VALUES (?) RETURNING id");
    $ins->execute([$nombre]);
    return $ins->fetchColumn();
}

/**
 * Crea o actualiza la fila de inventario (stock) de un producto.
 */
function guardarStock($conn, $producto_id, $stock) {
    $stmt = $conn->prepare("
        INSERT INTO inventario (producto_id, stock_actual)
        VALUES (?, ?)
        ON CONFLICT (producto_id)
        DO UPDATE SET stock_actual = EXCLUDED.stock_actual, fecha_actualizacion = now()
    ");
    $stmt->execute([$producto_id, $stock]);
}

switch ($method) {

    case 'GET':

        $sql = "SELECT
                    p.id,
                    p.codigo,
                    p.nombre,
                    p.descripcion,
                    p.categoria_id,
                    c.nombre AS categoria,
                    p.precio_compra,
                    p.precio_venta,
                    p.iva,
                    p.imagen,
                    p.estado,
                    COALESCE(i.stock_actual, 0) AS stock,
                    COALESCE(v.total_vendido, 0) AS vendidos
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                LEFT JOIN inventario i ON i.producto_id = p.id
                LEFT JOIN (
                    SELECT producto_id, SUM(cantidad) AS total_vendido
                    FROM detalle_pedidos
                    GROUP BY producto_id
                ) v ON v.producto_id = p.id
                ORDER BY p.id DESC";

        $stmt = $conn->query($sql);
        $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($productos);
        break;

    case 'POST':

        $data = json_decode(file_get_contents("php://input"), true);

        $codigo        = $data['codigo'] ?? ('P' . time());
        $nombre        = $data['nombre'] ?? '';
        $descripcion   = $data['descripcion'] ?? '';
        $categoria_id  = obtenerOcrearCategoria($conn, $data['categoria'] ?? '');
        $precio_compra = $data['precio_compra'] ?? ($data['precio_venta'] ?? 0);
        $precio_venta  = $data['precio_venta'] ?? 0;
        $iva           = $data['iva'] ?? 19;
        $imagen        = $data['imagen'] ?? '📦';
        $stock         = $data['stock'] ?? 0;

        $stmt = $conn->prepare("
            INSERT INTO productos
            (codigo, nombre, descripcion, categoria_id, precio_compra, precio_venta, iva, imagen)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
        ");

        $ok = $stmt->execute([
            $codigo,
            $nombre,
            $descripcion,
            $categoria_id,
            $precio_compra,
            $precio_venta,
            $iva,
            $imagen
        ]);

        if ($ok) {
            $nuevoId = $stmt->fetchColumn();
            guardarStock($conn, $nuevoId, $stock);
        }

        echo json_encode([
            "success" => $ok
        ]);

        break;

    case 'PUT':

        $data = json_decode(file_get_contents("php://input"), true);

        $id           = $data['id'];
        $categoria_id = obtenerOcrearCategoria($conn, $data['categoria'] ?? '');

        $stmt = $conn->prepare("
            UPDATE productos
            SET
                nombre=?,
                descripcion=?,
                categoria_id=?,
                precio_compra=?,
                precio_venta=?,
                iva=?,
                imagen=?
            WHERE id=?
        ");

        $ok = $stmt->execute([
            $data['nombre'],
            $data['descripcion'] ?? '',
            $categoria_id,
            $data['precio_compra'] ?? ($data['precio_venta'] ?? 0),
            $data['precio_venta'] ?? 0,
            $data['iva'] ?? 19,
            $data['imagen'] ?? '📦',
            $id
        ]);

        if ($ok) {
            guardarStock($conn, $id, $data['stock'] ?? 0);
        }

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

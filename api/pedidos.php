<?php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

require_once "conexion.php";

$method = $_SERVER['REQUEST_METHOD'];

/**
 * Trae todos los pedidos (o solo los de un usuario) junto con sus items.
 */
function obtenerPedidosConItems($conn, $usuarioId = null) {
    $sql = "SELECT id, usuario_id, usuario_nombre, metodo_pago, tiempo_recogida, estado, total, fecha
            FROM pedidos";
    $params = [];

    if ($usuarioId !== null) {
        $sql .= " WHERE usuario_id = ?";
        $params[] = $usuarioId;
    }

    $sql .= " ORDER BY id DESC";

    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $pedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$pedidos) {
        return [];
    }

    $ids = array_column($pedidos, 'id');
    $in  = implode(',', array_fill(0, count($ids), '?'));

    $stmtItems = $conn->prepare("
        SELECT pedido_id, producto_id, nombre, emoji, precio, cantidad
        FROM detalle_pedidos
        WHERE pedido_id IN ($in)
        ORDER BY id ASC
    ");
    $stmtItems->execute($ids);
    $itemsRows = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

    $itemsPorPedido = [];
    foreach ($itemsRows as $row) {
        $itemsPorPedido[$row['pedido_id']][] = [
            "productoId" => (int) $row['producto_id'],
            "nombre"     => $row['nombre'],
            "emoji"      => $row['emoji'],
            "precio"     => (float) $row['precio'],
            "cantidad"   => (int) $row['cantidad'],
        ];
    }

    foreach ($pedidos as &$p) {
        $p['usuarioId']      = (int) $p['usuario_id'];
        $p['usuarioNombre']  = $p['usuario_nombre'];
        $p['metodoPago']     = $p['metodo_pago'];
        $p['tiempoRecogida'] = (int) $p['tiempo_recogida'];
        $p['total']          = (float) $p['total'];
        $p['fecha']          = date('d/m/Y, h:i a', strtotime($p['fecha']));
        $p['items']          = $itemsPorPedido[$p['id']] ?? [];
        unset($p['usuario_id'], $p['usuario_nombre'], $p['metodo_pago'], $p['tiempo_recogida']);
    }
    unset($p);

    return $pedidos;
}

switch ($method) {

    case 'GET':

        $usuarioId = isset($_GET['usuario_id']) ? (int) $_GET['usuario_id'] : null;
        echo json_encode(obtenerPedidosConItems($conn, $usuarioId));
        break;

    case 'POST':

        $data = json_decode(file_get_contents("php://input"), true);

        $usuarioId      = $data['usuarioId'] ?? null;
        $usuarioNombre  = $data['usuarioNombre'] ?? '';
        $metodoPago     = $data['metodoPago'] ?? 'efectivo';
        $tiempoRecogida = $data['tiempoRecogida'] ?? 20;
        $estado         = $data['estado'] ?? 'pendiente';
        $total          = $data['total'] ?? 0;
        $items          = $data['items'] ?? [];

        if (!$usuarioId || empty($items)) {
            echo json_encode(["success" => false, "mensaje" => "Faltan datos del pedido (usuario o productos)."]);
            break;
        }

        try {
            $conn->beginTransaction();

            // La fecha la genera la base de datos (now()) para evitar
            // problemas de formato con la columna timestamp.
            $stmt = $conn->prepare("
                INSERT INTO pedidos
                    (usuario_id, cliente_id, usuario_nombre, metodo_pago, tiempo_recogida, estado, subtotal, iva, total, fecha)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, 0, ?, now())
                RETURNING id
            ");
            $stmt->execute([
                $usuarioId,
                $usuarioId,       // cliente_id: usamos el mismo id del usuario que compra
                $usuarioNombre,
                $metodoPago,
                $tiempoRecogida,
                $estado,
                $total,           // subtotal (simplificado: igual al total)
                $total,
            ]);
            $pedidoId = $stmt->fetchColumn();

            $stmtItem = $conn->prepare("
                INSERT INTO detalle_pedidos (pedido_id, producto_id, nombre, emoji, precio, cantidad, subtotal)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");

            foreach ($items as $item) {
                $precio    = $item['precio'] ?? 0;
                $cantidad  = $item['cantidad'] ?? 1;
                $stmtItem->execute([
                    $pedidoId,
                    $item['productoId'] ?? null,
                    $item['nombre'] ?? '',
                    $item['emoji'] ?? '📦',
                    $precio,
                    $cantidad,
                    $precio * $cantidad,
                ]);
            }

            $conn->commit();

            echo json_encode(["success" => true, "id" => (int) $pedidoId]);

        } catch (Exception $e) {
            $conn->rollBack();
            echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
        }

        break;

    case 'PUT':

        parse_str($_SERVER['QUERY_STRING'], $params);
        $id = $params['id'] ?? null;

        $data   = json_decode(file_get_contents("php://input"), true);
        $estado = $data['estado'] ?? null;

        if (!$id || !$estado) {
            echo json_encode(["success" => false, "mensaje" => "Falta el id o el nuevo estado."]);
            break;
        }

        $stmt = $conn->prepare("UPDATE pedidos SET estado = ? WHERE id = ?");
        $ok = $stmt->execute([$estado, $id]);

        echo json_encode(["success" => $ok]);

        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "mensaje" => "Método no permitido."]);
}
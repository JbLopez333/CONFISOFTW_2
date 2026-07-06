<?php

// ============================================================
// API de PEDIDOS
// Maneja la creación de pedidos (con sus items/detalle) y la
// consulta y actualización de estado de pedidos existentes.
// ============================================================

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

    // Si se pide un usuario específico, se filtra por su id
    if ($usuarioId !== null) {
        $sql .= " WHERE usuario_id = ?";
        $params[] = $usuarioId;
    }

    $sql .= " ORDER BY id DESC";

    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $pedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$pedidos) {
        return []; // no hay pedidos, se evita hacer consultas innecesarias
    }

    // Se obtienen los ids de todos los pedidos encontrados, para traer
    // de una sola vez los items (detalle) de todos ellos
    $ids = array_column($pedidos, 'id');
    $in  = implode(',', array_fill(0, count($ids), '?')); // genera "?,?,?,..."

    $stmtItems = $conn->prepare("
        SELECT pedido_id, producto_id, nombre, emoji, precio, cantidad
        FROM detalle_pedidos
        WHERE pedido_id IN ($in)
        ORDER BY id ASC
    ");
    $stmtItems->execute($ids);
    $itemsRows = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

    // Se agrupan los items por pedido_id, para poder asignarlos
    // fácilmente a cada pedido en el siguiente paso
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

    // Se arma el resultado final: cada pedido con sus datos "camelCase"
    // (como los espera el front-end) y su lista de items
    foreach ($pedidos as &$p) {
        $p['usuarioId']      = (int) $p['usuario_id'];
        $p['usuarioNombre']  = $p['usuario_nombre'];
        $p['metodoPago']     = $p['metodo_pago'];
        $p['tiempoRecogida'] = (int) $p['tiempo_recogida'];
        $p['total']          = (float) $p['total'];
        $p['fecha']          = date('d/m/Y, h:i a', strtotime($p['fecha']));
        $p['items']          = $itemsPorPedido[$p['id']] ?? [];
        // Se eliminan las claves originales en snake_case, ya duplicadas arriba
        unset($p['usuario_id'], $p['usuario_nombre'], $p['metodo_pago'], $p['tiempo_recogida']);
    }
    unset($p); // rompe la referencia del foreach

    return $pedidos;
}

switch ($method) {

    // ----------------------------------------------------------------
    // GET: listar pedidos (todos, o solo los de ?usuario_id=...)
    // ----------------------------------------------------------------
    case 'GET':

        $usuarioId = isset($_GET['usuario_id']) ? (int) $_GET['usuario_id'] : null;
        echo json_encode(obtenerPedidosConItems($conn, $usuarioId));
        break;

    // ----------------------------------------------------------------
    // POST: crear un pedido nuevo junto con todos sus items
    // ----------------------------------------------------------------
    case 'POST':

        $data = json_decode(file_get_contents("php://input"), true);

        $usuarioId      = $data['usuarioId'] ?? null;
        $usuarioNombre  = $data['usuarioNombre'] ?? '';
        $metodoPago     = $data['metodoPago'] ?? 'efectivo';
        $tiempoRecogida = $data['tiempoRecogida'] ?? 20;
        $estado         = $data['estado'] ?? 'pendiente';
        $total          = $data['total'] ?? 0;
        $items          = $data['items'] ?? [];

        // Un pedido necesita obligatoriamente un usuario y al menos un producto
        if (!$usuarioId || empty($items)) {
            echo json_encode(["success" => false, "mensaje" => "Faltan datos del pedido (usuario o productos)."]);
            break;
        }

        try {
            // Se usa una transacción: o se guardan el pedido Y todos sus items,
            // o no se guarda nada (evita pedidos "a medias" si algo falla)
            $conn->beginTransaction();

            // La fecha la genera la base de datos (now()) para evitar
            // problemas de formato con la columna timestamp.
            // NOTA: no llenamos cliente_id porque esa columna apunta a una
            // tabla "clientes" separada que esta app no usa; los usuarios
            // que compran viven en la tabla "usuarios" (usuario_id).
            $stmt = $conn->prepare("
                INSERT INTO pedidos
                    (usuario_id, usuario_nombre, metodo_pago, tiempo_recogida, estado, subtotal, iva, total, fecha)
                VALUES
                    (?, ?, ?, ?, ?, ?, 0, ?, now())
                RETURNING id
            ");
            $stmt->execute([
                $usuarioId,
                $usuarioNombre,
                $metodoPago,
                $tiempoRecogida,
                $estado,
                $total,           // subtotal (simplificado: igual al total)
                $total,
            ]);
            $pedidoId = $stmt->fetchColumn();

            // Se inserta cada item (producto) del pedido en detalle_pedidos
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
                    $precio * $cantidad, // subtotal de esta línea
                ]);
            }

            // Todo salió bien: se confirman todos los cambios de una vez
            $conn->commit();

            echo json_encode(["success" => true, "id" => (int) $pedidoId]);

        } catch (Exception $e) {
            // Si algo falla en medio del proceso, se deshace todo
            // (no queda el pedido creado sin sus items, por ejemplo)
            $conn->rollBack();
            echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
        }

        break;

    // ----------------------------------------------------------------
    // PUT: actualizar solo el estado de un pedido
    // (pendiente / listo / entregado), identificado por ?id=...
    // ----------------------------------------------------------------
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

    // ----------------------------------------------------------------
    // Cualquier otro método HTTP no está soportado
    // ----------------------------------------------------------------
    default:
        http_response_code(405);
        echo json_encode(["success" => false, "mensaje" => "Método no permitido."]);
}

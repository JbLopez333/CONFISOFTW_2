<?php

// ============================================================
// API de NOTIFICACIONES
// Permite listar, crear y marcar como leídas las notificaciones
// del sistema (ej: avisos de nuevos pedidos).
// ============================================================

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

require_once "conexion.php";

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    // ----------------------------------------------------------------
    // GET: listar todas las notificaciones, más recientes primero
    // ----------------------------------------------------------------
    case 'GET':

        $stmt = $conn->query("
            SELECT id, titulo, mensaje, tipo, fecha, leida, usuario_id
            FROM notificaciones
            ORDER BY id DESC
        ");
        $notifs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Se recorren los resultados para convertir los tipos de datos
        // al formato correcto que espera el front-end (JS)
        foreach ($notifs as &$n) {
            $n['id']         = (int) $n['id'];
            $n['leida']      = (bool) ((int) $n['leida']);
            $n['fecha']      = date('c', strtotime($n['fecha'])); // ISO 8601, listo para new Date() en JS
            $n['usuario_id'] = $n['usuario_id'] !== null ? (int) $n['usuario_id'] : null;
        }
        unset($n); // buena práctica: romper la referencia del foreach

        echo json_encode($notifs);
        break;

    // ----------------------------------------------------------------
    // POST: crear una notificación nueva
    // ----------------------------------------------------------------
    case 'POST':

        $data = json_decode(file_get_contents("php://input"), true);

        $titulo    = $data['titulo']    ?? '';
        $mensaje   = $data['mensaje']   ?? '';
        $tipo      = $data['tipo']      ?? 'pedido';
        $usuarioId = $data['usuarioId'] ?? null; // null = notificación general, no de un usuario específico

        if ($titulo === '' || $mensaje === '') {
            echo json_encode(["success" => false, "mensaje" => "Faltan datos de la notificación."]);
            break;
        }

        // La fecha la pone la base de datos (now()), así evitamos problemas
        // de formato/zona horaria con lo que mande el navegador.
        $stmt = $conn->prepare("
            INSERT INTO notificaciones (titulo, mensaje, tipo, leida, usuario_id, fecha)
            VALUES (?, ?, ?, 0, ?, now())
            RETURNING id
        ");
        $ok = $stmt->execute([$titulo, $mensaje, $tipo, $usuarioId]);

        echo json_encode([
            "success" => $ok,
            "id"      => $ok ? (int) $stmt->fetchColumn() : null
        ]);
        break;

    // ----------------------------------------------------------------
    // PUT: marcar notificaciones como leídas
    // ?todas=1  -> marca todas como leídas
    // ?id=5     -> marca solo esa como leída
    // ----------------------------------------------------------------
    case 'PUT':

        parse_str($_SERVER['QUERY_STRING'], $params);

        if (isset($params['todas'])) {
            // Marca absolutamente todas las notificaciones como leídas
            $stmt = $conn->prepare("UPDATE notificaciones SET leida = 1");
            $ok = $stmt->execute();
        } elseif (isset($params['id'])) {
            // Marca solo una notificación puntual como leída
            $stmt = $conn->prepare("UPDATE notificaciones SET leida = 1 WHERE id = ?");
            $ok = $stmt->execute([$params['id']]);
        } else {
            // No se especificó ni "todas" ni "id"
            $ok = false;
        }

        echo json_encode(["success" => $ok]);
        break;

    // ----------------------------------------------------------------
    // Cualquier otro método HTTP no está soportado
    // ----------------------------------------------------------------
    default:
        http_response_code(405); // Método no permitido
        echo json_encode(["success" => false, "mensaje" => "Método no permitido."]);
}

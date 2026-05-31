<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

$configPath = __DIR__ . '/config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Falta config.php. Copia config.example.php y completa los datos.']);
    exit;
}

$config = require $configPath;

function db(array $config): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = "mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4";
    $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $pdo;
}

function require_admin(): void
{
    if (empty($_SESSION['btu_admin'])) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'No autorizado.']);
        exit;
    }
}

function text(string $key): string
{
    return trim((string)($_POST[$key] ?? ''));
}

function upload_image(array $config): ?string
{
    if (empty($_FILES['image']) || ($_FILES['image']['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        throw new RuntimeException('No se pudo subir la imagen.');
    }

    if ($_FILES['image']['size'] > 5 * 1024 * 1024) {
        throw new RuntimeException('La imagen supera 5 MB.');
    }

    $tmp = $_FILES['image']['tmp_name'];
    $info = getimagesize($tmp);
    if (!$info) {
        throw new RuntimeException('El archivo no es una imagen valida.');
    }

    $allowed = [
        IMAGETYPE_JPEG => 'jpg',
        IMAGETYPE_PNG => 'png',
        IMAGETYPE_WEBP => 'webp',
    ];

    if (!isset($allowed[$info[2]])) {
        throw new RuntimeException('Formato no permitido. Usa JPG, PNG o WebP.');
    }

    if (!is_dir($config['upload_dir'])) {
        mkdir($config['upload_dir'], 0755, true);
    }

    $name = bin2hex(random_bytes(12)) . '.' . $allowed[$info[2]];
    $dest = rtrim($config['upload_dir'], '/') . '/' . $name;
    if (!move_uploaded_file($tmp, $dest)) {
        throw new RuntimeException('No se pudo guardar la imagen.');
    }

    return rtrim($config['upload_url'], '/') . '/' . $name;
}

try {
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    $pdo = db($config);

    if ($action === 'list_vacancies') {
        $stmt = $pdo->query("SELECT * FROM vacancies WHERE status = 'activa' ORDER BY created_at DESC");
        echo json_encode(['ok' => true, 'items' => $stmt->fetchAll()]);
        exit;
    }

    if ($action === 'view_vacancy') {
        $id = (int)($_GET['id'] ?? 0);
        $pdo->prepare('UPDATE vacancies SET views = views + 1 WHERE id = ?')->execute([$id]);
        $stmt = $pdo->prepare('SELECT * FROM vacancies WHERE id = ?');
        $stmt->execute([$id]);
        echo json_encode(['ok' => true, 'item' => $stmt->fetch()]);
        exit;
    }

    if ($action === 'submit_request') {
        $imageUrl = upload_image($config);
        $stmt = $pdo->prepare(
            'INSERT INTO vacancy_requests
            (title, company, location, category, description, email, whatsapp, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            text('title'),
            text('company'),
            text('location'),
            text('category'),
            text('description'),
            text('email'),
            text('whatsapp'),
            $imageUrl,
        ]);
        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'subscribe') {
        $email = strtolower(text('email'));
        $stmt = $pdo->prepare('INSERT IGNORE INTO subscribers (email) VALUES (?)');
        $stmt->execute([$email]);
        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'login') {
        $user = text('user');
        $password = text('password');
        if ($user === $config['admin_user'] && password_verify($password, $config['admin_password_hash'])) {
            $_SESSION['btu_admin'] = true;
            echo json_encode(['ok' => true]);
            exit;
        }
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Credenciales incorrectas.']);
        exit;
    }

    if ($action === 'admin_data') {
        require_admin();
        $requests = $pdo->query("SELECT * FROM vacancy_requests WHERE status = 'pendiente' ORDER BY created_at DESC")->fetchAll();
        $vacancies = $pdo->query('SELECT * FROM vacancies ORDER BY created_at DESC')->fetchAll();
        $subscribers = $pdo->query('SELECT * FROM subscribers ORDER BY created_at DESC')->fetchAll();
        echo json_encode(['ok' => true, 'requests' => $requests, 'vacancies' => $vacancies, 'subscribers' => $subscribers]);
        exit;
    }

    if ($action === 'create_vacancy') {
        require_admin();
        $imageUrl = upload_image($config);
        $stmt = $pdo->prepare(
            'INSERT INTO vacancies
            (title, company, location, category, description, email, whatsapp, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            text('title'),
            text('company'),
            text('location'),
            text('category'),
            text('description'),
            text('email'),
            text('whatsapp'),
            $imageUrl,
        ]);
        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'approve_request') {
        require_admin();
        $id = (int)text('id');
        $stmt = $pdo->prepare('SELECT * FROM vacancy_requests WHERE id = ?');
        $stmt->execute([$id]);
        $request = $stmt->fetch();
        if (!$request) {
            throw new RuntimeException('Solicitud no encontrada.');
        }

        $insert = $pdo->prepare(
            'INSERT INTO vacancies
            (title, company, location, category, description, email, whatsapp, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $insert->execute([
            $request['title'],
            $request['company'],
            $request['location'],
            $request['category'],
            $request['description'],
            $request['email'],
            $request['whatsapp'],
            $request['image_url'],
        ]);
        $pdo->prepare("UPDATE vacancy_requests SET status = 'aprobada' WHERE id = ?")->execute([$id]);
        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'reject_request') {
        require_admin();
        $pdo->prepare("UPDATE vacancy_requests SET status = 'rechazada' WHERE id = ?")->execute([(int)text('id')]);
        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'cover_vacancy') {
        require_admin();
        $pdo->prepare("UPDATE vacancies SET status = 'cubierta' WHERE id = ?")->execute([(int)text('id')]);
        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'delete_vacancy') {
        require_admin();
        $pdo->prepare('DELETE FROM vacancies WHERE id = ?')->execute([(int)text('id')]);
        echo json_encode(['ok' => true]);
        exit;
    }

    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => 'Accion no encontrada.']);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $error->getMessage()]);
}

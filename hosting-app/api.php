<?php
declare(strict_types=1);

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $isHttps,
    'httponly' => true,
    'samesite' => 'Strict',
]);
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

function client_ip(): string
{
    return substr((string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 0, 45);
}

function require_post(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        http_response_code(405);
        echo json_encode(['ok' => false, 'error' => 'Metodo no permitido.']);
        exit;
    }
}

function text(string $key): string
{
    return trim((string)($_POST[$key] ?? ''));
}

function require_fields(array $fields): void
{
    foreach ($fields as $field => $label) {
        if (text($field) === '') {
            throw new RuntimeException("Falta completar: {$label}.");
        }
    }
}

function ensure_site_stats(PDO $pdo): void
{
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS site_stats (
            stat_key VARCHAR(80) PRIMARY KEY,
            stat_value BIGINT UNSIGNED NOT NULL DEFAULT 0,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )"
    );
}

function ensure_admin_settings(PDO $pdo): void
{
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS admin_settings (
            setting_key VARCHAR(80) PRIMARY KEY,
            setting_value TEXT NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )"
    );
}

function ensure_security_tables(PDO $pdo): void
{
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS login_attempts (
            ip_address VARCHAR(45) PRIMARY KEY,
            attempts INT UNSIGNED NOT NULL DEFAULT 0,
            locked_until DATETIME NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS admin_audit_logs (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            action VARCHAR(80) NOT NULL,
            details TEXT NULL,
            ip_address VARCHAR(45) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )"
    );
}

function admin_setting(PDO $pdo, string $key, string $fallback): string
{
    ensure_admin_settings($pdo);
    $stmt = $pdo->prepare('SELECT setting_value FROM admin_settings WHERE setting_key = ?');
    $stmt->execute([$key]);
    $value = $stmt->fetchColumn();
    return is_string($value) && $value !== '' ? $value : $fallback;
}

function set_admin_setting(PDO $pdo, string $key, string $value): void
{
    ensure_admin_settings($pdo);
    $stmt = $pdo->prepare(
        'INSERT INTO admin_settings (setting_key, setting_value)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
    );
    $stmt->execute([$key, $value]);
}

function current_admin_user(PDO $pdo, array $config): string
{
    return admin_setting($pdo, 'admin_user', (string)$config['admin_user']);
}

function current_admin_password_hash(PDO $pdo, array $config): string
{
    return admin_setting($pdo, 'admin_password_hash', (string)$config['admin_password_hash']);
}

function set_admin_password_hash(PDO $pdo, string $hash): void
{
    set_admin_setting($pdo, 'admin_password_hash', $hash);
}

function csrf_token(): string
{
    if (empty($_SESSION['btu_csrf'])) {
        $_SESSION['btu_csrf'] = bin2hex(random_bytes(32));
    }
    return (string)$_SESSION['btu_csrf'];
}

function require_csrf(): void
{
    $token = text('csrf_token');
    $sessionToken = (string)($_SESSION['btu_csrf'] ?? '');
    if ($sessionToken === '' || !hash_equals($sessionToken, $token)) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Sesion vencida. Cerrá el panel y volvé a entrar.']);
        exit;
    }
}

function log_admin_action(PDO $pdo, string $action, string $details = ''): void
{
    ensure_security_tables($pdo);
    $stmt = $pdo->prepare('INSERT INTO admin_audit_logs (action, details, ip_address) VALUES (?, ?, ?)');
    $stmt->execute([$action, $details, client_ip()]);
}

function check_login_lock(PDO $pdo): void
{
    ensure_security_tables($pdo);
    $stmt = $pdo->prepare('SELECT attempts, locked_until FROM login_attempts WHERE ip_address = ?');
    $stmt->execute([client_ip()]);
    $row = $stmt->fetch();
    if (!$row || empty($row['locked_until'])) {
        return;
    }
    if (strtotime((string)$row['locked_until']) > time()) {
        http_response_code(429);
        echo json_encode(['ok' => false, 'error' => 'Demasiados intentos. Probá nuevamente en unos minutos.']);
        exit;
    }
}

function record_login_failure(PDO $pdo): void
{
    ensure_security_tables($pdo);
    $ip = client_ip();
    $pdo->prepare('INSERT IGNORE INTO login_attempts (ip_address, attempts) VALUES (?, 0)')->execute([$ip]);
    $pdo->prepare(
        'UPDATE login_attempts
        SET attempts = attempts + 1,
            locked_until = IF(attempts + 1 >= 5, DATE_ADD(NOW(), INTERVAL 10 MINUTE), locked_until)
        WHERE ip_address = ?'
    )->execute([$ip]);
}

function clear_login_failures(PDO $pdo): void
{
    $pdo->prepare('DELETE FROM login_attempts WHERE ip_address = ?')->execute([client_ip()]);
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

    if ($action === 'site_visit') {
        require_post();
        ensure_site_stats($pdo);
        $countVisit = (int)($_POST['count'] ?? 0) === 1;
        $pdo->prepare("INSERT IGNORE INTO site_stats (stat_key, stat_value) VALUES ('site_visits', 0)")->execute();
        if ($countVisit) {
            $pdo->prepare("UPDATE site_stats SET stat_value = stat_value + 1 WHERE stat_key = 'site_visits'")->execute();
        }
        $stmt = $pdo->prepare("SELECT stat_value FROM site_stats WHERE stat_key = 'site_visits'");
        $stmt->execute();
        echo json_encode(['ok' => true, 'visits' => (int)$stmt->fetchColumn()]);
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
        require_post();
        require_fields([
            'title' => 'puesto',
            'company' => 'empresa',
            'location' => 'ubicacion',
            'category' => 'categoria',
            'description' => 'descripcion',
            'email' => 'correo',
            'whatsapp' => 'WhatsApp',
        ]);
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
        require_post();
        $email = strtolower(text('email'));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('Ingresa un correo valido.');
        }
        $stmt = $pdo->prepare('INSERT IGNORE INTO subscribers (email) VALUES (?)');
        $stmt->execute([$email]);
        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'login') {
        require_post();
        check_login_lock($pdo);
        $user = text('user');
        $password = text('password');
        if ($user === current_admin_user($pdo, $config) && password_verify($password, current_admin_password_hash($pdo, $config))) {
            session_regenerate_id(true);
            $_SESSION['btu_admin'] = true;
            $_SESSION['btu_admin_user'] = $user;
            csrf_token();
            clear_login_failures($pdo);
            log_admin_action($pdo, 'login_success', "Usuario: {$user}");
            echo json_encode(['ok' => true, 'csrf_token' => csrf_token(), 'admin_user' => $user]);
            exit;
        }
        record_login_failure($pdo);
        log_admin_action($pdo, 'login_failure', "Usuario intentado: {$user}");
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'Credenciales incorrectas.']);
        exit;
    }

    if ($action === 'change_admin_password') {
        require_post();
        require_admin();
        require_csrf();
        $currentPassword = text('current_password');
        $newPassword = text('new_password');
        if (!password_verify($currentPassword, current_admin_password_hash($pdo, $config))) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'La clave actual no es correcta.']);
            exit;
        }
        if (strlen($newPassword) < 12) {
            http_response_code(422);
            echo json_encode(['ok' => false, 'error' => 'La nueva clave debe tener al menos 12 caracteres.']);
            exit;
        }
        set_admin_password_hash($pdo, password_hash($newPassword, PASSWORD_DEFAULT));
        session_regenerate_id(true);
        $_SESSION['btu_admin'] = true;
        $_SESSION['btu_csrf'] = bin2hex(random_bytes(32));
        log_admin_action($pdo, 'change_password', 'Clave admin actualizada.');
        echo json_encode(['ok' => true, 'csrf_token' => csrf_token()]);
        exit;
    }

    if ($action === 'change_admin_user') {
        require_post();
        require_admin();
        require_csrf();
        $newUser = text('new_user');
        if (!preg_match('/^[a-zA-Z0-9._-]{6,40}$/', $newUser)) {
            http_response_code(422);
            echo json_encode(['ok' => false, 'error' => 'El usuario debe tener 6 a 40 caracteres y usar letras, numeros, punto, guion o guion bajo.']);
            exit;
        }
        set_admin_setting($pdo, 'admin_user', $newUser);
        $_SESSION['btu_admin_user'] = $newUser;
        log_admin_action($pdo, 'change_user', "Nuevo usuario: {$newUser}");
        echo json_encode(['ok' => true, 'admin_user' => $newUser, 'csrf_token' => csrf_token()]);
        exit;
    }

    if ($action === 'recover_admin_password') {
        require_post();
        $token = text('token');
        $newPassword = text('new_password');
        $configuredToken = (string)($config['setup_token'] ?? '');
        if ($configuredToken === '' || !hash_equals($configuredToken, $token)) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Token de recuperacion incorrecto.']);
            exit;
        }
        if (strlen($newPassword) < 12) {
            http_response_code(422);
            echo json_encode(['ok' => false, 'error' => 'La nueva clave debe tener al menos 12 caracteres.']);
            exit;
        }
        set_admin_password_hash($pdo, password_hash($newPassword, PASSWORD_DEFAULT));
        session_regenerate_id(true);
        $_SESSION['btu_admin'] = true;
        $_SESSION['btu_csrf'] = bin2hex(random_bytes(32));
        log_admin_action($pdo, 'recover_password', 'Clave admin recuperada con token.');
        echo json_encode(['ok' => true, 'csrf_token' => csrf_token()]);
        exit;
    }

    if ($action === 'admin_data') {
        require_admin();
        $requests = $pdo->query("SELECT * FROM vacancy_requests WHERE status = 'pendiente' ORDER BY created_at DESC")->fetchAll();
        $vacancies = $pdo->query('SELECT * FROM vacancies ORDER BY created_at DESC')->fetchAll();
        $subscribers = $pdo->query('SELECT * FROM subscribers ORDER BY created_at DESC')->fetchAll();
        ensure_security_tables($pdo);
        $auditLogs = $pdo->query('SELECT action, details, ip_address, created_at FROM admin_audit_logs ORDER BY created_at DESC LIMIT 30')->fetchAll();
        echo json_encode([
            'ok' => true,
            'requests' => $requests,
            'vacancies' => $vacancies,
            'subscribers' => $subscribers,
            'audit_logs' => $auditLogs,
            'admin_user' => current_admin_user($pdo, $config),
            'csrf_token' => csrf_token(),
        ]);
        exit;
    }

    if ($action === 'create_vacancy') {
        require_post();
        require_admin();
        require_csrf();
        require_fields([
            'title' => 'titulo del puesto',
            'company' => 'empresa',
            'location' => 'ubicacion',
            'category' => 'categoria',
            'description' => 'descripcion',
            'email' => 'correo',
            'whatsapp' => 'WhatsApp',
        ]);
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
        log_admin_action($pdo, 'create_vacancy', 'Vacante: ' . text('title'));
        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'approve_request') {
        require_post();
        require_admin();
        require_csrf();
        $id = (int)text('id');
        if ($id <= 0) {
            throw new RuntimeException('Solicitud no valida.');
        }
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
        log_admin_action($pdo, 'approve_request', "Solicitud {$id}: {$request['title']}");
        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'reject_request') {
        require_post();
        require_admin();
        require_csrf();
        $id = (int)text('id');
        if ($id <= 0) {
            throw new RuntimeException('Solicitud no valida.');
        }
        $pdo->prepare("UPDATE vacancy_requests SET status = 'rechazada' WHERE id = ?")->execute([$id]);
        log_admin_action($pdo, 'reject_request', "Solicitud {$id}");
        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'cover_vacancy') {
        require_post();
        require_admin();
        require_csrf();
        $id = (int)text('id');
        if ($id <= 0) {
            throw new RuntimeException('Vacante no valida.');
        }
        $pdo->prepare("UPDATE vacancies SET status = 'cubierta' WHERE id = ?")->execute([$id]);
        log_admin_action($pdo, 'cover_vacancy', "Vacante {$id}");
        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'delete_vacancy') {
        require_post();
        require_admin();
        require_csrf();
        $id = (int)text('id');
        if ($id <= 0) {
            throw new RuntimeException('Vacante no valida.');
        }
        $pdo->prepare('DELETE FROM vacancies WHERE id = ?')->execute([$id]);
        log_admin_action($pdo, 'delete_vacancy', "Vacante {$id}");
        echo json_encode(['ok' => true]);
        exit;
    }

    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => 'Accion no encontrada.']);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $error->getMessage()]);
}

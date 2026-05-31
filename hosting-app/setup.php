<?php
declare(strict_types=1);

header('Content-Type: text/plain; charset=utf-8');

$configPath = __DIR__ . '/config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo "Falta config.php\n";
    exit;
}

$config = require $configPath;
$token = (string)($_GET['token'] ?? '');

if (empty($config['setup_token']) || !hash_equals((string)$config['setup_token'], $token)) {
    http_response_code(403);
    echo "Token invalido\n";
    exit;
}

$dsn = "mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4";
$pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$sql = file_get_contents(__DIR__ . '/install.sql');
if ($sql === false) {
    http_response_code(500);
    echo "No se pudo leer install.sql\n";
    exit;
}

$statements = array_filter(array_map('trim', explode(';', $sql)));
foreach ($statements as $statement) {
    if ($statement !== '') {
        $pdo->exec($statement);
    }
}

if (!is_dir($config['upload_dir'])) {
    mkdir($config['upload_dir'], 0755, true);
}

echo "BTU instalado correctamente.\n";
echo "Importante: elimina setup.php despues de verificar el sitio.\n";

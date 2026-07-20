<?php
declare(strict_types=1);

$index = __DIR__ . '/index.html';
$backup = __DIR__ . '/btu-home.html';

if (is_file($index)) {
    header('Content-Type: text/html; charset=UTF-8');
    readfile($index);
    exit;
}

if (is_file($backup)) {
    @copy($backup, $index);
    header('Content-Type: text/html; charset=UTF-8');
    readfile($backup);
    exit;
}

http_response_code(503);
header('Content-Type: text/html; charset=UTF-8');
?>
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>UruWork | Busqueda de trabajo en Uruguay</title>
  </head>
  <body>
    <h1>UruWork sigue online</h1>
    <p>Estamos restaurando la portada. Probá recargar en unos minutos.</p>
  </body>
</html>

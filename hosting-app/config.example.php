<?php
declare(strict_types=1);

return [
    'db_host' => 'localhost',
    'db_name' => 'TU_BASE_DE_DATOS',
    'db_user' => 'TU_USUARIO',
    'db_pass' => 'TU_PASSWORD',
    'admin_user' => 'admin',
    'admin_password_hash' => password_hash('BTU2026', PASSWORD_DEFAULT),
    'setup_token' => 'CAMBIAR_ESTE_TOKEN_LARGO',
    'upload_dir' => __DIR__ . '/uploads',
    'upload_url' => 'uploads',
];

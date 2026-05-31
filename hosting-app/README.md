# BTU para Hosting Montevideo

Esta carpeta contiene la version para publicar en un hosting con PHP y MySQL.

## Archivos

- `index.html`: sitio publico y panel admin.
- `styles.css`: estilos.
- `app-hosting.js`: frontend conectado a la API.
- `api.php`: API PHP para vacantes, solicitudes, imagenes, newsletter y admin.
- `install.sql`: tablas MySQL.
- `config.example.php`: plantilla de configuracion.
- `uploads/`: carpeta donde se guardan imagenes.

## Instalacion en cPanel

1. Crear una base de datos MySQL.
2. Crear un usuario MySQL y asignarlo a la base con todos los permisos.
3. Entrar a phpMyAdmin e importar `install.sql`.
4. Copiar `config.example.php` como `config.php`.
5. Editar `config.php` con los datos reales de base de datos.
6. Subir el contenido de esta carpeta a `public_html` o a la carpeta del dominio.
7. Asegurar permisos de escritura para `uploads/`.

Tambien se puede ejecutar `setup.php` despues de crear `config.php`:

```text
https://tudominio.com/setup.php?token=TU_SETUP_TOKEN
```

Despues de instalar, eliminar `setup.php` del servidor.

## Admin

El usuario por defecto en `config.example.php` es:

```text
admin
```

La clave por defecto es:

```text
BTU2026
```

Antes de publicar, cambiar la clave. Para generar un hash nuevo, se puede usar PHP:

```php
<?php echo password_hash('TU_CLAVE_NUEVA', PASSWORD_DEFAULT);
```

Luego reemplazar `admin_password_hash` en `config.php`.

## GitHub + Hosting

GitHub guarda el codigo. El hosting publica los archivos.

No subir `config.php` a GitHub porque contiene contrasenas. Ya esta ignorado por `.gitignore`.

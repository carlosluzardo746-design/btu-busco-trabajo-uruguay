# BTU - Busco Trabajo Uruguay

Plataforma web de empleo para Uruguay con feed publico de vacantes, solicitudes de empresas, newsletter y panel de administracion.

## Estructura

- `index.html`, `styles.css`, `app.js`: prototipo local de prueba en navegador.
- `hosting-app/`: version real para publicar en Hosting Montevideo con PHP y MySQL.

## Camino elegido

Opcion A:

```text
GitHub para guardar cambios
+ Hosting Montevideo para publicar
+ PHP/MySQL para datos reales
```

## Publicacion

La carpeta que se sube al hosting es:

```text
hosting-app/
```

Antes de publicar:

1. Crear base de datos MySQL en cPanel.
2. Importar `hosting-app/install.sql`.
3. Copiar `hosting-app/config.example.php` a `hosting-app/config.php`.
4. Completar datos reales en `config.php`.
5. Subir el contenido de `hosting-app/` a `public_html`.

No subir `config.php` a GitHub.

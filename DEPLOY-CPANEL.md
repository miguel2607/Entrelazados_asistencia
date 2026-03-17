# Desplegar Entrelazados en cPanel (PHP + React)

Este proyecto puede correr **todo en cPanel**: base de datos MySQL, API en PHP y frontend React (build estático).

## 1. Base de datos en cPanel

1. Entra a **cPanel → MySQL® Databases**.
2. Crea una base de datos (ej: `usuario_entrelazados`).
3. Crea un usuario de MySQL y asígnale una contraseña.
4. **Add User To Database**: asocia el usuario a la base con **ALL PRIVILEGES**.
5. Entra a **phpMyAdmin** (desde cPanel).
6. Elige la base de datos que creaste.
7. Pestaña **Import** → elige el archivo `backend-php/schema-cpanel.sql` → **Go**.

Con eso quedan creadas todas las tablas (acudientes, ninos, servicios, paquetes, planes, asistencia, etc.).

## 2. API PHP en cPanel

1. En tu PC, entra a la carpeta **`backend-php/api/v1/`** del proyecto.
2. Edita **`config.php`** y pon los datos de tu MySQL de cPanel:
   - `database`: nombre de la base (ej: `usuario_entrelazados`)
   - `username`: usuario de MySQL
   - `password`: contraseña del usuario
   - `host`: suele ser `localhost`
3. Sube **todo el contenido** de `backend-php/api/v1/` a tu hosting por FTP o **File Manager** de cPanel a:
   ```
   public_html/api/v1/
   ```
   Debe quedar algo así:
   ```
   public_html/api/v1/
     .htaccess
     config.php
     db.php
     index.php
     handlers/
       acudientes.php
       ninos.php
       ...
   ```
4. Comprueba que la API responde: abre en el navegador:
   ```
   https://tudominio.com/api/v1/servicios
   ```
   Deberías ver `[]` en JSON (lista vacía de servicios).

## 3. Frontend (React) en cPanel

1. En tu PC, en la carpeta del proyecto, abre terminal en **`frontend/`**.
2. Crea un archivo **`.env.production`** con:
   ```
   VITE_API_BASE=/api/v1
   ```
   Así el frontend en producción usará la API en el mismo dominio (tu PHP en `/api/v1`).
3. Genera el build:
   ```bash
   npm run build
   ```
4. En **`frontend/dist/`** se habrá generado el sitio estático (index.html y carpeta assets).
5. Sube **todo el contenido** de `frontend/dist/` a:
   ```
   public_html/
   ```
   (O a la carpeta raíz de tu dominio/subdominio.)
   No borres lo que ya tengas en `public_html/api/`: el build solo incluye index.html y assets; la API sigue en `public_html/api/v1/`.

Resultado típico en `public_html/`:
- `index.html` (y posiblemente más archivos del build)
- `assets/` (JS y CSS del frontend)
- `api/v1/` (API PHP que ya subiste antes)

## 4. Comprobar que todo funciona

1. Entra a **https://tudominio.com** (o la URL de tu sitio).
2. Deberías ver la app de Entrelazados (Dashboard, Niños, Asistencia, etc.).
3. Crea un servicio o un acudiente desde la app; si se guarda y se lista, la API PHP y la BD están bien configuradas.

## Resumen de URLs

| Dónde           | URL / archivo                          |
|----------------|----------------------------------------|
| Sitio (React)  | `https://tudominio.com/`               |
| API (PHP)      | `https://tudominio.com/api/v1/...`    |
| Ejemplo: listar niños | `GET https://tudominio.com/api/v1/ninos` |

## Si algo falla

- **Error de conexión a la BD**: revisa `config.php` (usuario, contraseña, nombre de BD, host `localhost`). En algunos hostings el host es distinto (te lo indica cPanel al crear la BD).
- **404 en /api/v1/...**: comprueba que `.htaccess` está en `public_html/api/v1/` y que mod_rewrite está activo (suele estarlo en cPanel).
- **Pantalla en blanco o errores en la app**: abre la consola del navegador (F12) y revisa si las peticiones a `/api/v1/...` fallan; si es así, el problema está en la API o en la BD.

## Desarrollo en local con PHP (opcional)

Si quieres probar la API PHP en tu PC sin Java:

1. PHP con MySQL (XAMPP, Laragon, o PHP + MySQL instalados).
2. Crea la BD e importa `schema-cpanel.sql`.
3. En `backend-php/api/v1/config.php` pon usuario/contraseña/BD de tu entorno local.
4. En la carpeta del proyecto, sirve la raíz con PHP, por ejemplo:
   ```bash
   php -S localhost:8000 -t .
   ```
   (O apunta el document root de Apache/Nginx a la carpeta del proyecto.)
5. En el frontend, crea `.env.local` con:
   ```
   VITE_API_BASE=http://localhost:8000/api/v1
   ```
   y ejecuta `npm run dev`. Así el frontend en local usará la API PHP en el puerto 8000.

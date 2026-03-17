# Entrelazados - Sistema de Asistencia Preescolar

Sistema web para gestión de preescolar: niños, acudientes, asistencia, servicios, paquetes y planes. Arquitectura limpia (Clean/Hexagonal), SOLID y patrones de diseño en backend; React + TypeScript + Tailwind en frontend.

## Stack

- **Backend:** Java 21, Spring Boot 3, Maven, JPA/Hibernate, MySQL 8, Spring Validation, springdoc-openapi (Swagger)
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router
- **Base de datos:** MySQL 8

## Requisitos previos

- JDK 21
- Maven 3.8+
- Node.js 18+ y npm
- MySQL 8 (o Docker)

## Base de datos MySQL

1. Crear base de datos y usuario (o usar usuario existente con permisos):

```sql
CREATE USER IF NOT EXISTS 'entrelazados'@'localhost' IDENTIFIED BY 'entrelazados';
CREATE DATABASE IF NOT EXISTS entrelazados_asistencia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON entrelazados_asistencia.* TO 'entrelazados'@'localhost';
FLUSH PRIVILEGES;
```

2. Ejecutar scripts en orden:

```bash
mysql -u entrelazados -p entrelazados_asistencia < backend/src/main/resources/schema.sql
mysql -u entrelazados -p entrelazados_asistencia < backend/src/main/resources/data.sql
```

(O abrir `schema.sql` y `data.sql` en tu cliente MySQL y ejecutarlos.)

## Ejecución

### Backend (puerto 8080)

```bash
cd backend
mvn spring-boot:run
```

- API base: `http://localhost:8080/api/v1`
- Swagger UI: `http://localhost:8080/api/v1/swagger-ui.html`

### Frontend (puerto 5173)

```bash
cd frontend
npm install
npm run dev
```

- App: `http://localhost:5173`

Asegúrate de que el backend esté corriendo para que el frontend pueda consumir la API.

## Ejemplos de endpoints (API base: `/api/v1`)

### Niños
- `GET /ninos` – Listar (opcional: `?nombre=...`)
- `GET /ninos/{id}` – Obtener por ID
- `GET /ninos/{id}/detalle` – Detalle con acudientes, planes activos y asistencia del día (opcional: `?fecha=yyyy-MM-dd`)
- `POST /ninos` – Crear (body: `{ "nombre", "ti", "fechaNacimiento" }`)
- `PUT /ninos/{id}` – Actualizar
- `DELETE /ninos/{id}` – Eliminar

### Acudientes
- `GET /acudientes` – Listar (opcional: `?nombre=...`)
- `GET /acudientes/{id}` – Obtener por ID
- `POST /acudientes` – Crear (body: `{ "nombre", "telefono", "cc" }`)
- `PUT /acudientes/{id}` – Actualizar
- `DELETE /acudientes/{id}` – Eliminar

### Relación Niño-Acudiente
- `POST /ninos-acudientes` – Asociar (body: `{ "idNino", "idAcudiente", "parentesco" }`)
- `GET /ninos-acudientes/nino/{idNino}` – Acudientes del niño
- `GET /ninos-acudientes/acudiente/{idAcudiente}` – Niños del acudiente
- `DELETE /ninos-acudientes?idNino=&idAcudiente=` – Desasociar

### Asistencia
- `POST /asistencia/entrada?idNino=&fecha=&horaEntrada=&observacion=` – Registrar entrada (fecha/hora opcionales, por defecto hoy/ahora)
- `POST /asistencia/salida?idNino=&fecha=&horaSalida=&observacion=` – Registrar salida
- `GET /asistencia/por-fecha?fecha=` – Listar por fecha (con datos del niño)
- `GET /asistencia/historial?idNino=&desde=&hasta=` – Historial por niño y rango de fechas

### Servicios
- `GET /servicios` – Listar
- `GET /servicios/{id}` – Obtener por ID
- `POST /servicios` – Crear (body: `{ "nombre", "precio" }`)
- `PUT /servicios/{id}` – Actualizar
- `DELETE /servicios/{id}` – Eliminar

### Paquetes
- `GET /paquetes` – Listar
- `GET /paquetes/{id}` – Obtener por ID (con servicios incluidos)
- `POST /paquetes` – Crear (body: `{ "nombre", "precio", "idServicios": [] }`)
- `PUT /paquetes/{id}` – Actualizar (incluye servicios)
- `DELETE /paquetes/{id}` – Eliminar

### Planes del niño
- `POST /planes/servicio?idNino=&idServicio=` – Asignar servicio (body: `{ "fechaInicio", "fechaFin" }`)
- `POST /planes/paquete?idNino=&idPaquete=` – Asignar paquete (body: `{ "fechaInicio", "fechaFin" }`)
- `GET /planes/activos-hoy?fecha=` – Planes activos en la fecha (si es paquete, incluye servicios)
- `GET /planes/nino/{idNino}` – Planes de un niño
- `DELETE /planes/{id}` – Eliminar plan

### Dashboard
- `GET /dashboard?fecha=` – Totales (niños, asistencia hoy, planes activos) y listas de asistencia de hoy y planes activos hoy

## Estructura del proyecto

### Backend (Clean Architecture)
- **domain:** Entidades de dominio, puertos (interfaces de repositorios), factory de plan (Servicio/Paquete), strategy (PlanVigente)
- **application:** Casos de uso (servicios), excepciones de negocio
- **infrastructure:** Entidades JPA, repositorios Spring Data, adaptadores que implementan los puertos, configuración (CORS, OpenAPI)
- **interfaces:** Controladores REST, DTOs, mappers manuales, GlobalExceptionHandler

### Frontend
- **features:** dashboard, ninos, acudientes, asistencia, servicios, paquetes, planes (páginas y lógica por módulo)
- **shared/api:** Cliente API (fetch), manejo de errores
- **shared/components:** Layout, Table, Modal, Toast

## Validaciones

- **Negocio:** `fecha_fin >= fecha_inicio` en planes (backend y recomendado en frontend).
- **Asistencia:** UNIQUE(id_nino, fecha); un solo registro por niño y fecha.
- **DTOs:** Jakarta Validation en requests (nombre obligatorio, precios >= 0, etc.).

## Convenciones

- Nombres en español en dominio y DTOs (nino, acudiente, asistencia, servicio, paquete, plan).
- API bajo `/api/v1`.
- Backend: puerto 8080. Frontend: puerto 5173.

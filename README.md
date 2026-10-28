# 🐈‍⬛ Gateter

Pequeña red social para amantes de los gatos donde cada usuario publica mensajes cortos llamados **maullidos** (máx. 140 caracteres).

- **Backend:** Python 3.12 · Django 5.1 · Django REST Framework · PostgreSQL 16 · Gunicorn
- **Frontend:** HTML + CSS + JavaScript puro (módulos ES, sin build), servido por Nginx
- **Infra:** Docker Compose (3 servicios), health checks, CI en GitHub Actions, CD a Render

## 🌐 Demo en vivo

**👉 https://TU-SERVICIO.onrender.com** <!-- reemplaza con tu URL de Render -->

> Está en el plan gratuito de Render: si nadie la ha usado en los últimos 15 minutos,
> **la primera carga puede tardar ~1 minuto** mientras el servidor despierta.

Cada push a `main` que pasa el CI se despliega automáticamente. Ver [docs/DEPLOY.md](docs/DEPLOY.md).

![Columna de usuarios](docs/screenshots/07-columna-usuarios.png)

**Funcionalidades:** registro con login automático · inicio/cierre de sesión · publicar maullidos de hasta 140 caracteres · perfil público en `/usuarios/<nombre>` con mensaje claro si no existe · columna lateral con **todos los gatos, buscador y estado "en línea"** (menú lateral en móvil) · modo oscuro automático.

---

## 🚀 Puesta en marcha

### Opción A — Docker (recomendada)

Requisitos: Docker 24+ con Docker Compose v2.

```bash
cp .env.example .env        # opcional: todos los valores tienen default
docker compose up --build   # o: make up
```

Abre **http://localhost:8080** 🎉

Comandos útiles (`make help` los lista todos):

| Comando          | Qué hace                                             |
| ---------------- | ---------------------------------------------------- |
| `make up`        | Construye y levanta la app en segundo plano          |
| `make logs`      | Sigue los logs de todos los servicios                |
| `make test`      | Corre los tests del backend contra PostgreSQL        |
| `make superuser` | Crea un superusuario para `/admin/`                  |
| `make reset`     | Borra contenedores **y** datos                       |

### Opción B — Local sin Docker

```bash
# Backend (usa SQLite por defecto)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements/dev.txt
export DJANGO_DEBUG=1
python manage.py migrate
python manage.py runserver 8000
```

El frontend necesita que `/api` esté en el mismo origen (cookies de sesión + CSRF). Lo más simple es usar Docker para el frontend, o cualquier servidor estático con proxy de `/api` → `localhost:8000` y *fallback* a `index.html`.

### Tests y calidad

```bash
cd backend
python manage.py test          # 32 tests: auth, CSRF, perfiles, directorio, presencia, maullidos, paginación
ruff check . && ruff format --check .
```

---

## 🏗️ Arquitectura

```
                 ┌──────────────────────── docker compose ─────────────────────────┐
 Navegador ──►   │  frontend (Nginx :80)                                            │
 :8080           │   ├─ /            → SPA (index.html + /assets)                   │
                 │   └─ /api, /admin → proxy ──► backend (Gunicorn + Django :8000)  │
                 │                                     └──► db (PostgreSQL :5432)   │
                 └──────────────────────────────────────────────────────────────────┘
```

Solo el puerto del frontend se publica; backend y BD viven en una red interna.

### Estructura

```
gateter/
├── docker-compose.yml · Makefile · .env.example · .github/workflows/ci.yml
├── render.yaml · Dockerfile.render · deploy/render/   # producción (Render)
├── docs/DEPLOY.md                                    # guía de despliegue
├── backend/
│   ├── config/               # settings (12-factor), urls raíz, wsgi
│   ├── docker/               # entrypoint (migraciones) y gunicorn.conf.py
│   └── apps/
│       ├── core/             # health check, manejador de errores, paginación, base de tests
│       ├── accounts/         # User, registro/login/logout, perfil, directorio y presencia
│       └── meows/            # Meow, publicar y listar maullidos
│           ├── models.py       → datos e invariantes
│           ├── selectors.py    → consultas de lectura
│           ├── services.py     → lógica de negocio (escrituras)
│           ├── serializers.py  → validación/forma de entrada y salida
│           ├── views.py        → HTTP fino: orquesta serializer + service
│           └── tests/
└── frontend/
    ├── nginx/default.conf.template  # SPA fallback, proxy, CSP (compartida local/producción)
    └── src/
        ├── index.html
        └── assets/
            ├── css/main.css
            └── js/
                ├── api/          # cliente HTTP + un módulo por recurso
                ├── state/        # sesión (observable mínimo)
                ├── components/   # navbar, sidebar (usuarios), meowCard, meowForm, authForm, toast…
                ├── views/        # home, login, register, profile, notFound
                ├── utils/        # dom (h), tiempo relativo, conteo de caracteres
                ├── router.js     # History API
                └── main.js
```

### API REST

| Método | Ruta                             | Auth     | Descripción                                   |
| ------ | -------------------------------- | -------- | --------------------------------------------- |
| GET    | `/api/health/`                   | —        | Salud del servicio (verifica la BD)           |
| GET    | `/api/auth/session/`             | —        | Usuario actual o `null`; entrega cookie CSRF  |
| POST   | `/api/auth/register/`            | CSRF     | Crea la cuenta **e inicia sesión**            |
| POST   | `/api/auth/login/`               | CSRF     | Inicia sesión                                 |
| POST   | `/api/auth/logout/`              | CSRF     | Cierra sesión                                 |
| GET    | `/api/users/?q=<texto>`          | —        | Directorio: conectados primero, búsqueda      |
| GET    | `/api/users/<username>/`         | —        | Perfil público + presencia (404 si no existe) |
| GET    | `/api/users/<username>/meows/`   | —        | Maullidos, más recientes primero (cursor)     |
| POST   | `/api/meows/`                    | Sesión   | Publica un maullido como el usuario actual    |

Todos los errores comparten formato:

```json
{ "error": { "code": "user_not_found", "message": "No encontramos a ningún usuario con ese nombre." } }
```

Los de validación añaden `fields` (`{"content": ["Máximo 140 caracteres."]}`), que el frontend pinta junto a cada campo.

### Rutas del frontend

`/` inicio (si hay sesión redirige a tu perfil) · `/registro` · `/login` · `/usuarios/<nombre>` perfil público; si es el tuyo aparece el compositor de maullidos · cualquier otra ruta → 404 amigable.

En todas las páginas, la **columna izquierda** lista a los usuarios (conectados primero) con su estado. Se puede filtrar escribiendo en "Buscar gatos…"; `Enter` abre el primer resultado. En pantallas de menos de 900 px la columna se abre con el botón 👥.

---

## 🧠 Decisiones técnicas

**Backend y frontend desacoplados, mismo origen.** Django expone solo una API JSON y el frontend es un SPA estático. Nginx sirve ambos bajo el mismo dominio, lo que permite separar responsabilidades sin pagar el coste de CORS.

**Autenticación por sesión + CSRF (no JWT).** Al compartir origen, la cookie de sesión `HttpOnly` es la opción más segura en navegador: JavaScript nunca toca la credencial, se invalida en el servidor al hacer logout y Django la rota al iniciar sesión. DRF solo valida CSRF a usuarios ya autenticados, así que login y registro lo fuerzan explícitamente (`csrf_protect`) para evitar *login CSRF*.

**Capas services / selectors.** Las vistas son delgadas; la lógica vive en funciones puras y testeables (`register_user`, `create_meow`, `get_public_profile`). `create_meow` llama a `full_clean()`, así el límite de 140 se respeta también desde el admin o la shell, no solo desde la API.

**Modelo de usuario propio desde el día 1** (recomendación oficial de Django). Usernames únicos **sin distinguir mayúsculas** con una restricción a nivel de BD (`UniqueConstraint(Lower("username"))`); `/usuarios/Michi` y `/usuarios/michi` son el mismo perfil, y el login también es insensible a mayúsculas.

**Integridad en la base de datos.** `varchar(140)`, `CHECK` de contenido no vacío e índice compuesto `(author, -created_at, -id)` que cubre exactamente la consulta del timeline.

**Paginación por cursor.** Estable aunque lleguen maullidos nuevos (no hay duplicados ni saltos al pedir "cargar más") y su coste no crece con la página. El frontend extrae solo el `cursor` de la URL `next` para no depender del host que ve el backend detrás del proxy.

**Conteo de caracteres coherente.** El contador del frontend cuenta *code points* (`[...texto].length`), igual que `len()` en Python: un 😺 cuenta 1, no 2 como `String.length`.

**Frontend sin framework ni build.** Módulos ES nativos, un router de ~60 líneas con History API y un helper `h()` para crear DOM. Nunca se usa `innerHTML` con datos de usuario → XSS imposible por construcción (probado publicando `<img onerror=…>`). Las vistas reciben un `AbortSignal` que el router aborta al navegar, cancelando peticiones y suscripciones pendientes.

**Presencia con polling, no WebSockets.** Un middleware guarda `last_seen` cuando un usuario autenticado usa la API, como mucho una escritura cada 30 s por usuario. Alguien está "en línea" si tuvo actividad en los últimos 90 s, y la columna lateral se refresca cada 30 s (se pausa si la pestaña está oculta). Al cerrar sesión el usuario sale de "en línea" al instante. Con esto se obtiene un indicador fiable sin añadir Redis ni Django Channels. Si la app necesitara chat, el siguiente paso natural sería WebSockets y la presencia pasaría a basarse en conexiones abiertas.

**Seguridad adicional.** Throttling en login/registro (10/min) y publicación (30/min), validadores de contraseña de Django, mensaje de login genérico (no revela si el usuario existe), CSP estricta, `X-Frame-Options: DENY`, `nosniff`, contenedores sin root.

**Docker.** Imagen multi-stage con virtualenv, `collectstatic` en build, migraciones en el entrypoint, Gunicorn como servidor WSGI, *health checks* en los tres servicios y `depends_on: service_healthy` para un arranque ordenado sin scripts de espera. Configuración 100 % por variables de entorno.

**CD gateado por el CI.** En Render, `autoDeployTrigger: checksPass` hace que solo se despliegue un commit de `main` cuando todos los jobs de GitHub Actions están en verde, incluido uno que construye y prueba la imagen de producción simulando el entorno de Render. Así no hace falta guardar tokens en GitHub. Render ejecuta un contenedor por servicio, por lo que `Dockerfile.render` une Nginx y Gunicorn en una imagen sin root, reutilizando la **misma plantilla de Nginx** que el entorno local. Si uno de los dos procesos muere, el contenedor se detiene para que la plataforma lo reinicie. Detalles en [docs/DEPLOY.md](docs/DEPLOY.md).

**UX.** Redirección automática al perfil tras registrarse, validación local antes de llamar a la API, errores por campo, contador con aviso a los 20 restantes, `Ctrl/Cmd + Enter` para publicar, *skeleton* de carga, toasts, modo oscuro automático, diseño responsive y atención a accesibilidad (labels, `aria-live`, foco gestionado, *skip link*, `prefers-reduced-motion`).

---

## 🔮 Qué mejoraría con más tiempo

- **Tests E2E en CI** con Playwright (los flujos se verificaron con Playwright en local, pero el script no está integrado al pipeline).
- **Feed global y seguir usuarios** (modelo `Follow` + timeline de seguidos).
- **Editar/borrar maullidos**, likes y respuestas.
- **Mensajes directos entre usuarios** y **tiempo real** (maullidos nuevos sin recargar) con Django Channels + Redis; la presencia pasaría de polling a conexiones WebSocket.
- **Opción de privacidad** para ocultar el estado "en línea".
- **Caché y throttling compartidos** en Redis (hoy la caché es por proceso de Gunicorn).
- **Avatares** con almacenamiento S3-compatible.
- **Observabilidad:** logs estructurados en JSON, métricas Prometheus y trazas OpenTelemetry.
- **Producción:** HTTPS (Caddy/Traefik), HSTS, gestión de secretos y despliegue con imagen publicada desde CI.
- **TypeScript + bundler (Vite)** si el frontend crece.
- **Documentación OpenAPI** autogenerada con `drf-spectacular`.

---

## 📸 Capturas

| Buscador de usuarios | Menú de usuarios en móvil |
| --- | --- |
| ![Buscador](docs/screenshots/08-buscador.png) | ![Menú móvil](docs/screenshots/09-movil-menu-usuarios.png) |
| **Inicio** | **Registro con errores** |
| ![Inicio](docs/screenshots/01-inicio.png) | ![Registro](docs/screenshots/02-registro-errores.png) |
| **Usuario no encontrado** | **Perfil visto por un visitante** |
| ![404](docs/screenshots/04-usuario-no-encontrado.png) | ![Visitante](docs/screenshots/05-perfil-visitante.png) |

<p align="center"><img src="docs/screenshots/06-movil-oscuro.png" width="300" alt="Móvil en modo oscuro" /></p>

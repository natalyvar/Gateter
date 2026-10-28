# 🐈‍⬛ Gateter

[![CI](https://github.com/natalyvar/Gateter/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/natalyvar/Gateter/actions/workflows/ci.yml)

Pequeña red social para amantes de los gatos donde cada usuario publica mensajes cortos llamados **maullidos** (máx. 140 caracteres).

## 🌐 Demo en vivo

**👉 https://gateter.onrender.com**

> Corre en el plan gratuito de Render. Si nadie la ha usado en los últimos 15 minutos,
> **la primera carga puede tardar ~1 minuto** mientras el servidor despierta.

---

## Contenido

1. [Funcionalidades](#-funcionalidades)
2. [Stack](#-stack)
3. [Ejecutar en local](#-ejecutar-en-local)
4. [Arquitectura](#-arquitectura)
5. [Estructura del proyecto](#-estructura-del-proyecto)
6. [API REST](#-api-rest)
7. [CI/CD](#-cicd)
8. [Tests](#-tests)
9. [Decisiones técnicas](#-decisiones-técnicas)
10. [Seguridad](#-seguridad)
11. [Variables de entorno](#-variables-de-entorno)
12. [Qué mejoraría con más tiempo](#-qué-mejoraría-con-más-tiempo)

---

## ✨ Funcionalidades

### Requisitos de la prueba

| Requisito | Implementación |
| --- | --- |
| Registro con usuario y contraseña | `/registro`, con validación de formato, unicidad y contraseña segura |
| Logueado automáticamente al registrarse | El backend inicia la sesión en la misma petición de registro |
| Inicio de sesión | `/login` (el usuario no distingue mayúsculas) |
| Publicar maullidos de máx. 140 caracteres | Contador en vivo; validado en frontend, API y base de datos |
| Maullidos en el perfil, del más reciente al más antiguo | `/usuarios/<nombre>`, con paginación "cargar más" |
| Perfil público para cualquier visitante | Accesible sin sesión |
| Mensaje claro si el perfil no existe | Pantalla "Usuario no encontrado" |
| Publicar desde el propio perfil | El formulario aparece solo en tu perfil |

### Extras

- **Feed global en Inicio (`/`):** maullidos de todos los usuarios, del más reciente al más antiguo.
- **Editar y eliminar tus maullidos:** edición en línea con contador, etiqueta *"editado"* y confirmación antes de borrar. Solo el autor puede hacerlo; la API lo verifica.
- **Columna de usuarios:** lista de todos los gatos con buscador y estado **"en línea"**. En móvil se abre como menú lateral.
- **Modo oscuro automático**, diseño responsive y accesibilidad (labels, `aria-live`, foco gestionado, *skip link*).

---

## 🧰 Stack

| Capa | Tecnologías |
| --- | --- |
| Backend | Python 3.12 · Django 5.1 · Django REST Framework · Gunicorn |
| Base de datos | PostgreSQL 16 (SQLite como alternativa local sin Docker) |
| Frontend | HTML + CSS + JavaScript puro (módulos ES, sin build) |
| Servidor web | Nginx (archivos estáticos + proxy inverso) |
| Infraestructura | Docker · Docker Compose · GitHub Actions · Render |

---

## 🚀 Ejecutar en local

### Con Docker (recomendado)

Requisitos: Docker 24+ con Docker Compose v2.

```bash
git clone https://github.com/natalyvar/Gateter.git
cd Gateter
cp .env.example .env          # opcional: todos los valores tienen default
docker compose up --build
```

Abre **http://localhost:8080** 🎉

Atajos con `make` (`make help` los lista todos):

| Comando | Qué hace |
| --- | --- |
| `make up` | Construye y levanta la app en segundo plano |
| `make logs` | Sigue los logs de todos los servicios |
| `make test` | Corre los tests del backend contra PostgreSQL |
| `make superuser` | Crea un superusuario para `/admin/` |
| `make down` | Detiene los contenedores |
| `make reset` | Borra contenedores **y** datos |

> En Windows sin WSL, `make` no viene instalado: usa directamente los comandos `docker compose` equivalentes que aparecen en el `Makefile`.

### Sin Docker (solo backend)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements/dev.txt
export DJANGO_DEBUG=1             # usa SQLite
python manage.py migrate
python manage.py runserver 8000
```

El frontend necesita que `/api` esté en su mismo origen (cookies de sesión + CSRF), así que para la app completa lo más simple es Docker.

---

## 🏗️ Arquitectura

**Local (`docker-compose.yml`): un contenedor por proceso**

```
                 ┌──────────────────────── docker compose ─────────────────────────┐
 Navegador ──►   │  frontend (Nginx :80)                                            │
 :8080           │   ├─ /            → SPA (index.html + /assets)                   │
                 │   └─ /api, /admin → proxy ──► backend (Gunicorn + Django :8000)  │
                 │                                     └──► db (PostgreSQL :5432)   │
                 └──────────────────────────────────────────────────────────────────┘
```

Solo se publica el puerto del frontend; backend y base de datos viven en una red interna.

**Producción (Render): un contenedor con Nginx y Gunicorn**

```
 Navegador ──HTTPS──► Render ──► contenedor (Dockerfile.render, sin root)
                                  ├─ Nginx :$PORT  → SPA + proxy /api
                                  └─ Gunicorn 127.0.0.1:8000 ──► Render PostgreSQL
```

Render ejecuta un solo contenedor por servicio, por eso en producción ambos procesos comparten imagen. Los dos entornos usan **la misma plantilla de Nginx** (`frontend/nginx/default.conf.template`).

---

## 📁 Estructura del proyecto

```
gateter/
├── .github/workflows/ci.yml        # pipeline de CI
├── docker-compose.yml              # entorno local
├── Dockerfile.render               # imagen de producción
├── render.yaml                     # infraestructura en Render (Blueprint)
├── deploy/render/                  # nginx.conf y start.sh de producción
├── docs/DEPLOY.md                  # guía de despliegue paso a paso
├── Makefile · .env.example
│
├── backend/
│   ├── config/                     # settings (12-factor), urls, wsgi
│   ├── docker/                     # entrypoint (migraciones) y gunicorn.conf.py
│   └── apps/
│       ├── core/                   # health check, errores, paginación, base de tests
│       ├── accounts/               # usuarios, auth, perfiles, directorio y presencia
│       └── meows/                  # maullidos: feed, crear, editar, eliminar
│           ├── models.py           → datos e invariantes
│           ├── selectors.py        → consultas de lectura
│           ├── services.py         → lógica de negocio (escrituras)
│           ├── permissions.py      → solo el autor modifica
│           ├── serializers.py      → validación de entrada y forma de salida
│           ├── views.py            → HTTP fino: orquesta serializer + service
│           └── tests/
│
└── frontend/
    ├── nginx/default.conf.template # SPA fallback, proxy, CSP
    └── src/
        ├── index.html
        └── assets/
            ├── css/main.css
            └── js/
                ├── api/            # cliente HTTP + un módulo por recurso
                ├── state/          # sesión (observable mínimo)
                ├── components/     # timeline, meowCard, meowForm, sidebar, navbar…
                ├── views/          # feed, profile, login, register, notFound
                ├── utils/          # helper h(), fechas, presencia, conteo de caracteres
                ├── router.js       # router con History API
                └── main.js
```

---

## 🔌 API REST

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| GET | `/api/health/` | — | Salud del servicio (verifica la BD) |
| GET | `/api/auth/session/` | — | Usuario actual o `null`; entrega la cookie CSRF |
| POST | `/api/auth/register/` | CSRF | Crea la cuenta **e inicia sesión** |
| POST | `/api/auth/login/` | CSRF | Inicia sesión |
| POST | `/api/auth/logout/` | Sesión | Cierra sesión |
| GET | `/api/users/?q=<texto>` | — | Directorio: conectados primero, con búsqueda |
| GET | `/api/users/<username>/` | — | Perfil público y presencia (404 si no existe) |
| GET | `/api/users/<username>/meows/` | — | Maullidos del usuario, más recientes primero |
| GET | `/api/meows/` | — | Feed global, más recientes primero |
| POST | `/api/meows/` | Sesión | Publica un maullido |
| PATCH | `/api/meows/<id>/` | Autor | Edita el texto |
| DELETE | `/api/meows/<id>/` | Autor | Elimina el maullido |

Los listados usan **paginación por cursor** (`next` / `previous`). Todos los errores comparten un formato:

```json
{ "error": { "code": "user_not_found", "message": "No encontramos a ningún usuario con ese nombre." } }
```

Los errores de validación incluyen además `fields` (p. ej. `{"content": ["Máximo 140 caracteres."]}`), que el frontend muestra junto a cada campo.

---

## 🔄 CI/CD

```
 git push
    │
    ▼
 ┌──────────────────────── GitHub Actions (CI) ────────────────────────┐
 │  backend ───────┐                                                    │
 │  frontend ──────┼──► docker compose ──────────────┐                  │
 │                 └──► imagen de producción ────────┤                  │
 └───────────────────────────────────────────────────┼──────────────────┘
                                                     │ ¿todo en verde y rama main?
                                       ┌─────────────┴─────────────┐
                                       ▼ sí                        ▼ no
                        Render construye y despliega       producción no cambia
                        └─ tráfico solo si /api/health/ responde 200
```

### Integración continua (`.github/workflows/ci.yml`)

Se ejecuta en **cada push y pull request**, en cualquier rama.

| Job | Qué valida |
| --- | --- |
| `backend` | Lint y formato con `ruff`, que no falten migraciones y los 46 tests contra PostgreSQL 16 |
| `frontend` | Sintaxis de todos los módulos JavaScript |
| `docker compose` | Construye el stack local completo y hace un *smoke test* de la API y del frontend |
| `imagen de producción` | Construye `Dockerfile.render` y lo prueba simulando Render: `$PORT`, HTTPS en el proxy, ejecución sin root |

Detalles de mantenimiento:
- El runner está fijado a `ubuntu-24.04` para que el pipeline sea reproducible y no cambie solo.
- Las actions usan versiones que corren sobre Node 24.
- `concurrency` cancela ejecuciones viejas de la misma rama cuando llega un push nuevo.

### Despliegue continuo (Render)

- La infraestructura está declarada en [`render.yaml`](render.yaml) (Blueprint): servicio web Docker y PostgreSQL, ambos con `plan: free` explícito.
- Con `autoDeployTrigger: checksPass`, Render **solo despliega un commit de `main` cuando todos los jobs del CI pasan**. No hace falta guardar tokens ni secretos en GitHub.
- Render no envía tráfico a la nueva versión hasta que `/api/health/` responde. Si el despliegue falla, la versión anterior sigue sirviendo.
- `deploy/render/start.sh` aplica las migraciones y arranca Nginx y Gunicorn. Si cualquiera muere, detiene el contenedor para que Render lo reinicie.

| Acción | ¿Corre el CI? | ¿Se despliega? |
| --- | --- | --- |
| Push a `main` | ✅ | ✅ si el CI pasa |
| Push a otra rama | ✅ | ❌ |
| Pull request | ✅ | ❌ |
| Merge a `main` | ✅ | ✅ si el CI pasa |

📘 Guía completa de configuración en Render: **[docs/DEPLOY.md](docs/DEPLOY.md)**.

---

## 🧪 Tests

```bash
make test                          # con Docker, contra PostgreSQL
# o, sin Docker:
cd backend && DJANGO_DEBUG=1 python manage.py test
ruff check . && ruff format --check .
```

**46 tests de backend**, organizados por área:

| Área | Qué cubren |
| --- | --- |
| Autenticación (10) | Registro con login automático, unicidad sin mayúsculas, contraseñas débiles, login/logout, CSRF obligatorio en login y registro |
| Perfiles (2) | Perfil público y 404 claro |
| Directorio y presencia (10) | Orden por conexión, búsqueda, "en línea" tras actividad, fuera de línea al cerrar sesión, escrituras limitadas |
| Publicar y perfil (10) | Límite de 140, contenido vacío, autor no falsificable, orden y paginación |
| Feed, editar y eliminar (14) | Feed global, solo el autor edita o borra, marca de editado, 404, conteo del perfil |

Además, los flujos completos de la interfaz se verificaron con **Playwright** (navegador real) tanto en el entorno local como en una simulación de la imagen de producción.

---

## 🧠 Decisiones técnicas

**Backend y frontend desacoplados, mismo origen.** Django expone solo una API JSON y el frontend es un SPA estático. Nginx sirve ambos bajo el mismo dominio: se separan responsabilidades sin pagar el coste de CORS.

**Sesión + CSRF en lugar de JWT.** Al compartir origen, la cookie de sesión `HttpOnly` es lo más seguro en un navegador: JavaScript nunca toca la credencial y el logout la invalida en el servidor.

**Capas services / selectors.** Las vistas son delgadas y la lógica vive en funciones testeables (`create_meow`, `update_meow`, `list_feed`…). Los servicios llaman a `full_clean()`, así las reglas se cumplen también desde el admin o la shell.

**Modelo de usuario propio desde el día 1**, como recomienda Django. Los nombres son únicos **sin distinguir mayúsculas**, con una restricción en la base de datos: `/usuarios/Michi` y `/usuarios/michi` son el mismo perfil.

**Integridad en la base de datos.** `varchar(140)`, `CHECK` de contenido no vacío e índices que cubren exactamente las consultas del feed y del perfil.

**Paginación por cursor.** Es estable aunque lleguen maullidos nuevos (sin duplicados ni saltos al "cargar más") y su coste no crece con la página.

**Editar sin engañar.** `edited_at` solo se marca si el texto cambió de verdad, y la tarjeta muestra *"editado"* con la fecha exacta al pasar el cursor.

**Conteo de caracteres coherente.** El frontend cuenta *code points*, igual que `len()` en Python: un 😺 cuenta 1, no 2 como `String.length`.

**Frontend sin framework ni build.** Módulos ES nativos, un router propio con History API y un helper `h()` para crear DOM. La lista de maullidos (`timeline`) y la tarjeta (`meowCard`) son componentes reutilizados en Inicio y en el perfil. Las vistas reciben un `AbortSignal` que se cancela al navegar, sin peticiones huérfanas.

**Presencia con polling, no WebSockets.** Un middleware guarda la última actividad (como mucho una escritura cada 30 s por usuario), y alguien está "en línea" si tuvo actividad en los últimos 90 s. Es fiable sin añadir Redis ni Channels.

**Docker.** Imágenes multi-stage, sin root, con *health checks*, y arranque ordenado con `depends_on: service_healthy`. La configuración se hace 100 % por variables de entorno.

---

## 🔒 Seguridad

- **Contraseñas:** validadores de Django (longitud, comunes, numéricas, similares al usuario).
- **CSRF:** obligatorio en todas las escrituras, incluidos login y registro (evita *login CSRF*).
- **XSS:** nunca se usa `innerHTML` con datos del usuario; además hay una CSP estricta.
- **Autorización:** la API comprueba que solo el autor edite o elimine; ocultar botones en la UI no basta.
- **Throttling:** login/registro 10/min y escrituras de maullidos 30/min. Leer el feed no consume cupo.
- **Login genérico:** el mensaje de error no revela si el usuario existe.
- **Cabeceras:** `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`.
- **Cookies:** `Secure` y `HttpOnly` en producción.
- **Contenedores:** sin root; en producción solo se publica Nginx.

---

## ⚙️ Variables de entorno

Todas tienen un valor por defecto pensado para desarrollo local (ver [`.env.example`](.env.example)).

| Variable | Default | Uso |
| --- | --- | --- |
| `DJANGO_SECRET_KEY` | — (obligatoria si `DEBUG=0`) | Clave criptográfica de Django |
| `DJANGO_DEBUG` | `0` | Modo depuración |
| `DATABASE_URL` | SQLite local | Conexión a la base de datos |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Hosts permitidos |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `http://localhost:8080` | Orígenes de confianza para CSRF |
| `DJANGO_SECURE_COOKIES` | `0` | Cookies solo por HTTPS |
| `THROTTLE_AUTH_RATE` / `THROTTLE_MEOWS_RATE` | `10/min` / `30/min` | Límites anti abuso |
| `PRESENCE_ONLINE_SECONDS` | `90` | Ventana para considerar a alguien "en línea" |
| `GUNICORN_WORKERS` | según CPU (máx. 4) | Procesos de Gunicorn |

En Render, `RENDER_EXTERNAL_HOSTNAME` se agrega automáticamente a los hosts permitidos y a los orígenes CSRF.

---

## 🔮 Qué mejoraría con más tiempo

- **Tests E2E en el CI** con Playwright: hoy se ejecutan en local, no en el pipeline.
- **Seguir usuarios**, con un feed solo de las cuentas que sigues, además de likes y respuestas.
- **Tiempo real:** maullidos nuevos sin recargar y mensajes directos, con Django Channels + Redis. La presencia pasaría de polling a conexiones WebSocket.
- **Caché y throttling compartidos** en Redis (hoy son por proceso de Gunicorn).
- **Privacidad:** opción para ocultar el estado "en línea".
- **Avatares** con almacenamiento compatible con S3.
- **Observabilidad:** logs estructurados en JSON, métricas Prometheus y trazas OpenTelemetry.
- **Dominio propio** con HSTS, y un entorno de *staging* para revisar pull requests antes de producción.
- **Documentación OpenAPI** autogenerada con `drf-spectacular`.
- **TypeScript + Vite** si el frontend crece.

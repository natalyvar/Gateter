# 🌐 Despliegue en Render (CD)

Guía paso a paso para publicar Gateter en internet de forma **gratuita** y con
**despliegue continuo**: cada push a `main` que pase el CI se publica solo.

```
git push origin main
   │
   ▼
GitHub Actions (CI)
   ├─ backend           ruff + migraciones + 46 tests contra PostgreSQL
   ├─ frontend          sintaxis de los módulos JS
   ├─ docker compose    build + smoke test del stack local
   └─ imagen de prod.   build de Dockerfile.render + smoke test simulando Render
   │
   ▼  ¿todos en verde?
   ├─ NO  → Render no despliega (producción sigue con la versión anterior)
   └─ SÍ  → Render construye Dockerfile.render y despliega
              └─ espera a que /api/health/ responda 200 antes de enviar tráfico
```

Esto lo controla `autoDeployTrigger: checksPass` en [`render.yaml`](../render.yaml).
No hace falta guardar ningún secreto en GitHub.

---

## Antes de empezar

- El proyecto debe estar en un repositorio de **GitHub**, con la rama `main`.
- El CI debe pasar en verde al menos una vez (pestaña **Actions** del repo).

## 1. Crear la cuenta

1. Entra a <https://render.com> y regístrate con **"Sign up with GitHub"**.
2. Cuando pida permisos, autoriza el acceso **al repositorio de Gateter**
   (puedes limitarlo a ese repo).

> Render puede pedir una tarjeta para verificar la cuenta. El plan Free no
> genera cobros; aun así, sigue el paso 3 para confirmarlo.

## 2. Crear todo con el Blueprint

1. En el dashboard: **New → Blueprint**.
2. Elige el repositorio de Gateter y la rama **`main`**.
3. Render lee `render.yaml` y muestra lo que va a crear:
   - `gateter` — Web Service (Docker)
   - `gateter-db` — PostgreSQL
4. **Verifica que ambos digan `Free`.** Si alguno muestra otro plan, no continúes.
5. Pulsa **Apply / Deploy Blueprint**.

El primer despliegue tarda unos minutos (construye la imagen, crea la BD y
aplica las migraciones). Puedes seguirlo en **gateter → Logs**. Termina cuando
aparece *"Your service is live"*.

## 3. Confirmar que no hay cobros

**Account (icono de tu perfil) → Billing**: el uso estimado debe ser **$0**.

## 4. Probar y publicar el link

1. En el servicio `gateter` copia la URL (algo como `https://gateter-xxxx.onrender.com`).
2. Ábrela, crea un usuario y publica un maullido.
3. Pega la URL en la sección **"🌐 Demo en vivo"** del `README.md` y haz push.
   Ese push pasa por el CI y, si queda en verde, se despliega solo: ya estás
   usando el CD. 🎉

## 5. Verificar el CD

- En **Render → gateter → Settings**, la opción de *Auto-Deploy* debe estar
  configurada para esperar a que pasen los checks del CI (lo hace el Blueprint).
- En **Events** verás cada despliegue con el commit que lo originó.
- Haz la prueba: rompe un test a propósito en una rama, ábrela como PR y
  verás que el CI queda en rojo. Si llegara a `main` en ese estado, Render no
  desplegaría.

---

## Límites del plan gratuito

| Qué | Comportamiento | Qué hacer |
| --- | --- | --- |
| Inactividad | El servicio se apaga tras 15 min sin visitas; la siguiente tarda ~1 min en cargar | Abre el link 1–2 minutos antes de compartirlo |
| Base de datos | Expira a los **30 días** de creada; hay 14 días de gracia antes de borrarse | Anota la fecha. Alcanza de sobra para el periodo de evaluación |
| Horas | 750 horas gratis al mes por cuenta | Suficiente para este servicio, que además se apaga cuando no se usa |

## Problemas frecuentes

**El deploy falla en "health check"**
Revisa **Logs**. La línea `→ Aplicando migraciones…` debe ir seguida de
`→ Iniciando Gunicorn y Nginx…`. Si falla antes, suele ser la conexión a la BD:
comprueba que `gateter-db` esté *Available*.

**Hice push y no se desplegó**
Mira la pestaña **Actions** de GitHub: si algún job está en rojo, Render
espera. Corrige y vuelve a hacer push. También puedes forzar un despliegue con
**Manual Deploy → Deploy latest commit**.

**Error 403 "CSRF" al registrarse**
La app confía automáticamente en el dominio `*.onrender.com` del servicio
(variable `RENDER_EXTERNAL_HOSTNAME`). Si añades un dominio propio, agrégalo en
**Environment** a `DJANGO_ALLOWED_HOSTS` y `DJANGO_CSRF_TRUSTED_ORIGINS`
(con `https://`).

---

## ¿Por qué una imagen distinta para producción?

Render ejecuta **un contenedor por servicio** y le asigna un puerto en `$PORT`.
`Dockerfile.render` empaqueta en una sola imagen lo mismo que en local corre
en dos contenedores:

| | Local (`docker-compose.yml`) | Render (`Dockerfile.render`) |
| --- | --- | --- |
| Nginx | contenedor `frontend` | mismo contenedor, puerto `$PORT` |
| Gunicorn | contenedor `backend` | mismo contenedor, `127.0.0.1:8000` |
| PostgreSQL | contenedor `db` | Render Postgres gestionado |
| Config Nginx | `frontend/nginx/default.conf.template` | **la misma plantilla** |

`deploy/render/start.sh` aplica migraciones, arranca ambos procesos y, si
cualquiera de ellos muere, detiene el contenedor para que Render lo reinicie
(en lugar de quedar "vivo" pero respondiendo errores). Todo corre sin root.

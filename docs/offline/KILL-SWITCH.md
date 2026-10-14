# Kill-switch del modo offline (Service Worker)

Plan: `docs/offline/PLAN-offline.md` §11.6 · Change: `openspec/changes/add-offline-reads` (tarea 1.5).

`wrangler rollback` **no** deshace un Service Worker ya instalado en los navegadores: el SW sigue sirviendo el shell precacheado. Por eso hay tres niveles de apagado, de menor a mayor impacto.

## 1. Flag de build `VITE_APP_OFFLINE` (`off | read | full`, default `read`)

- Se define en el secreto `ENV_FILE` del environment y se hornea en el bundle.
- `off`: en la próxima carga, `lib/offline/sw-update.ts` **desregistra** el SW de la app y borra las caches `workbox-*` (no toca IndexedDB). Tampoco se registra uno nuevo. Las fases siguientes (persister/outbox) deben leer `getOfflineMode()` de `lib/offline/offline-mode.ts`.
- Requiere un deploy normal. Como `index.html` y `/sw.js` van con `Cache-Control: no-cache` (`public/_headers`), los clientes con SW reciben el bundle nuevo vía el aviso "Hay una nueva versión…" o al cerrar todas las pestañas.

## 2. Flag remoto `GET /api/eval-col/config/offline` (opcional, sin backend hoy)

- Respuesta esperada: `{ "mode": "off" | "read" | "full" }`. Solo puede **bajar** el modo del build.
- Se consulta al arrancar online con timeout de 3 s. Si da 404, error de red o JSON inválido, se usa el valor del build (falla seguro).
- Ventaja: no requiere redeploy del front. Limitación: lo evalúa el bundle **nuevo** o el que ya está instalado; un SW que sirve un shell roto que ni siquiera arranca la app no lo va a leer → nivel 3.

## 3. Build de emergencia autodesregistrable

Úsalo si el SW instalado está sirviendo algo roto (la app no arranca, chunks inconsistentes, etc.).

1. En el `ENV_FILE` del environment afectado agrega `VITE_APP_SW_KILL=true` y `VITE_APP_OFFLINE=off`:
   `scripts/setup-environment-secrets.sh <env>` (o edita el secreto en GitHub).
2. Redespliega el mismo commit (workflow `deploy-test.yml` / `release.yml` manual) o, en local:
   ```bash
   VITE_APP_SW_KILL=true VITE_APP_OFFLINE=off pnpm build
   pnpm exec wrangler deploy --env <env>
   ```
   `vite.config.ts` compila `src/sw/sw-kill.ts` en lugar de `src/sw/sw.ts`, publicado en el **mismo** `/sw.js`.
3. Cada navegador, al revisar `/sw.js` (en cada navegación, porque va `no-cache`, y como mínimo cada 24 h por regla del navegador), instala el SW de emergencia, que:
   - hace `skipWaiting` y toma control,
   - borra **todas** las caches de la Cache API,
   - se desregistra (`self.registration.unregister()`),
   - recarga las pestañas abiertas (`client.navigate`).
   **No borra IndexedDB**: la outbox y la sesión persistida se conservan; la app sin SW sigue sincronizando.
4. Verifica en DevTools → Application → Service Workers que no queda ninguno (salvo `mockServiceWorker.js` en `dev`).
5. Cuando el problema esté corregido, quita `VITE_APP_SW_KILL` y vuelve `VITE_APP_OFFLINE` a `read`. Deja el build de emergencia publicado al menos **una semana** antes de volver a activar el SW, para que lo reciban los equipos que abren la app poco.

## Cabeceras (Cloudflare Workers Static Assets)

`public/_headers` (Vite lo copia a `dist/_headers`; lo aplica el servidor de assets, el Worker solo atiende `/api/*`):

| Ruta | `Cache-Control` |
|---|---|
| `/*` (incluye `index.html` y el fallback SPA) | `no-cache` |
| `/sw.js` | `no-cache, no-store, must-revalidate` |
| `/assets/*` (hash de contenido) | `public, max-age=31536000, immutable` |

### Assets de deploys anteriores

Workers Static Assets publica **solo** los archivos del deploy actual: tras un deploy, los chunks con hash del deploy anterior dan 404 (con `not_found_handling: single-page-application` devolverían `index.html`, aunque Vite pide los chunks como módulos y el import falla igual). No hay una opción para retener assets anteriores sin agregar almacenamiento propio (R2/KV) y servirlos desde el Worker, lo que no vale la pena en esta fase. Mitigación actual:

- Con el SW instalado, la pestaña vieja sigue resolviendo sus chunks lazy **desde el precache** de su versión hasta que el usuario pulsa "Actualizar" (el precache nuevo se instala aparte y `cleanupOutdatedCaches` solo borra cuando el SW nuevo se activa).
- Sin SW (primer uso o kill-switch), el comportamiento es el de siempre: un chunk lazy viejo puede fallar y el error boundary pide recargar.

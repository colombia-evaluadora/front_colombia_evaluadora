# Change: Resiliencia de red (Fase 0 del plan offline)

## Why

Hoy una caída de red de dos segundos durante una recarga expulsa al usuario al login (`getUser()` convierte cualquier error en "sin sesión"), un 403 con la red caída borra toda la cache y redirige a `/login`, cada request fallida dispara su propio toast y, sin `timeout`, los botones quedan en "Guardando…" para siempre en redes lentas o portales cautivos. Es la base sobre la que se construyen las fases offline (lectura, escritura en cola, sagas del planeador) y aporta valor aunque esas fases nunca se hagan.

Fuente de diseño: [`docs/offline/PLAN-offline.md`](../../../docs/offline/PLAN-offline.md) (§2 bloqueadores B1–B6, B13; §11 Fase 0).

## What Changes

- **Sesión**: `getUser()` distingue 401 (sin sesión) de error de red; `hasSession` reintenta con backoff (3 intentos) y, si sigue sin red, no redirige a `/login` sino que muestra un error de red con "Reintentar". **BREAKING (comportamiento)**: un error de red ya no equivale a "sin sesión".
- **403 con refresh fallido por red** deja de tratarse como sesión vencida: no se limpia la cache ni se redirige; la conectividad pasa a `degraded`.
- **Cliente HTTP**: `timeout` de 20 s (120 s multipart), clasificador `isNetworkError`, sin toasts por errores de red (los reemplaza el banner), reporte de errores de red al store de conectividad.
- **Queries**: `retry` solo para errores de red (máx. 2 reintentos) y `networkMode: "online"` explícito.
- **Conectividad**: nuevo `connectivityStore` (`online | degraded | offline`) con heartbeat, histéresis y detección de portal cautivo; banner global offline/degradado con copy exacto (sin cola todavía).
- **Idempotency-Key**: el cliente genera un UUID v4 por mutación y lo manda en el header (el gateway lo ignora hasta BE-1).
- **Invalidación**: se corrigen los huecos X1 (tabs de unidades) y X2 (`actividad.calificaciones(id)`) de §15; `/app/pendientes` entra en `isAlwaysAllowedPath` para la Fase 2.
- **Worker**: `Cache-Control: no-store` en respuestas `/api` (BE-10). **Backend**: `GET /eval-col/health` liviano y sin auth (BE-4).
- **Pruebas**: nuevo proyecto Vitest `unit` (node + `fake-indexeddb`), script `pnpm test:unit` y paso en `ci.yml`.
- `lib/offline/connectivity.ts` se diseña sin dependencias de features para poder copiarse a `front_pigse` (solo con pedido explícito).

## Impact

- Specs afectadas: `session-auth`, `api-resilience`, `navigation-access`, `app-shell`, `planeador-planilla`; nueva capacidad `connectivity`.
- Código: `src/lib/auth.ts`, `src/lib/api-client.ts`, `src/lib/react-query.ts`, `src/lib/offline/connectivity.ts` (nuevo), `src/components/layout/*` (banner), `src/router.tsx` (`isAlwaysAllowedPath`), mutaciones del planeador (invalidaciones), `worker/index.js`, `vite.config.ts` / `package.json` (proyecto `unit`), `.github/workflows/ci.yml`.
- Backend: BE-4 (health) y BE-10 (no-store). Sin cambios de esquema.
- Decisiones vigentes del plan (§0) que condicionan fases siguientes: esquema BE-3B y BE-5 aprobados en PRs separados de `sso`; 14 días de escritura offline; 10 MB por archivo y 150 MB / 60 archivos por usuario; política de datos de menores **pendiente (bloqueador P6)**. Ninguna afecta a esta fase, que no persiste datos.
- Rollback: revert del PR (no hay estado persistido).

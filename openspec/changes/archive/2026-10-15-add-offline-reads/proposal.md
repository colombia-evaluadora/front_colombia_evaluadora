# Change: Lectura offline (Fase 1 del plan offline)

## Why

Con la Fase 0 un error de red ya no expulsa al usuario, pero recargar sin red sigue dejando la pantalla en blanco: no hay app shell en cache ni datos persistidos. El docente necesita consultar en el aula, sin internet, lo que ya preparó (actividades, unidades, planilla, asistencia, referentes).

Fuente de diseño: [`docs/offline/PLAN-offline.md`](../../../docs/offline/PLAN-offline.md) §3 D1, D2, D7; §5; §7.5, §7.8–7.10; §8; §9.4, §9.7; §11 Fase 1; §11.6.

## What Changes

- Service Worker (`vite-plugin-pwa`, `injectManifest`, `registerType: "prompt"`) que precachea `dist/` (shell + chunks lazy) con `navigateFallback` excepto `/api`; manifest e íconos (P12). No se registra en el entorno `dev` (MSW, B12).
- Toast "Hay una nueva versión de Colombia Evaluadora." con "Actualizar", nunca `skipWaiting` durante una sincronización.
- Kill-switch: flag remoto (`GET /api/eval-col/config/offline` y/o `VITE_APP_OFFLINE = off|read|full`, P13) y build de emergencia del SW que se autodesregistra sin borrar IndexedDB.
- IndexedDB `ce-offline` (stores `meta`, `session`, `queries`), persister selectivo de TanStack Query por lista blanca (`meta.offline: { ttl, scope }`), `buster = "${userSub}:${SCHEMA_VERSION}"`, ~40 queries marcadas (planeador, planilla, asistencia, referentes, catálogos).
- Modo "autenticado sin conexión" (D7) con `session` persistida (sin token), menú y permisos persistidos (TTL 30 días), hidratados antes de `router.load()`.
- `useOnlineOnly` y empty states para vistas solo en línea; "Preparar para usar sin conexión"; badge "Datos del …".
- Limpieza en logout y cambio de usuario; **modo equipo compartido por defecto** mientras la política de datos de menores (P6, §0.3) siga pendiente; minimización de campos (`persistSelect`: nombre + pk del estudiante).

## Impact

- Specs: `app-shell`, `session-auth`, `navigation-access`; nueva `offline-persistence`.
- Código: `vite.config.ts`, `src/sw.ts`, `src/main.tsx`, `src/provider.tsx`, `src/lib/offline/{db,query-persister,hooks}.ts`, `src/lib/auth.ts`, `src/router.tsx`, `features/offline/*`, queries con `meta.offline`, pantalla de login.
- Dependencias nuevas: `vite-plugin-pwa`, `idb`, `@tanstack/react-query-persist-client`.
- Decisiones §0: 0.3 (menores pendiente → modo compartido por defecto, piloto opt-in) aplica de lleno. Esquema: ninguno.
- Go/no-go: persistido promedio < 20 MB, hidratación < 300 ms p95, 0 errores de SW en una semana de `test`.

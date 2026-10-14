# Design: Resiliencia de red (Fase 0)

Fuente completa: [`docs/offline/PLAN-offline.md`](../../../docs/offline/PLAN-offline.md) (§2, §3 D7–D8, §4, §7.1, §9.1–9.2, §11 Fase 0 y §11.6). Este documento recoge solo lo que decide la Fase 0 y lo que deja preparado para las siguientes.

## Context

- El access token vive solo en memoria y la sesión se restaura con `POST /auth/refresh` (cookie httpOnly `sso_refresh`). `getUser()` captura cualquier error y devuelve `null` (B1), `hasSession` lo usa en el `beforeLoad` de `/app` (B2).
- Ante un 403 el interceptor revalida con `/auth/refresh`; si esa llamada falla por red, marca sesión vencida, hace `queryClient.clear()` y navega a `/login` (B3).
- Toast global por cada error de axios (B4), `retry: false` sin `networkMode` (B5), sin `timeout` (B6).
- No hay Service Worker ni persistencia (B7): esta fase **no** los introduce.
- Usuarios objetivo: docentes en aulas con Wi-Fi escolar inestable, 3G y portales cautivos.

## Goals / Non-Goals

**Goals**
- Un error de red nunca cierra la sesión ni borra la cache.
- Ninguna request cuelga indefinidamente.
- El usuario ve un único indicador de estado de conexión en lugar de ráfagas de toasts.
- Dejar listos los contratos que usarán las fases 1–4: `connectivityStore`, `isNetworkError`, `Idempotency-Key`, invalidaciones correctas y el script `test:unit`.

**Non-Goals**
- Lectura offline (persister, Service Worker, sesión persistida) → `add-offline-reads`.
- Cola de escrituras, `/app/pendientes`, conflictos → `add-offline-writes-asistencia-planilla`.
- Sagas del planeador → `add-offline-planeador-sagas`.
- Modificar `front_pigse` (solo se diseña para que sea copiable).

## Decisions

### D-0.1 Distinguir 401 de error de red en `getUser()`
- **Decisión**: `getUser()` devuelve `null` solo ante 401/403 del refresh; ante error de red/timeout/5xx lanza un `NetworkSessionError`. `hasSession` reintenta 3 veces con backoff (1 s, 2 s, 4 s) y, si persiste, el `beforeLoad` lanza un error que el `ErrorPage` pinta como "No pudimos comunicarnos con el servidor" + "Reintentar", sin redirigir.
- **Alternativa descartada**: seguir devolviendo `null` y confiar en que el usuario vuelva a iniciar sesión. Pierde el trabajo en pantalla y obliga a tener red para el login, justo lo que el offline quiere evitar.
- **Alternativa diferida**: entrar en modo "autenticado sin conexión" con usuario persistido (D7 del plan). Requiere IndexedDB y menú persistido; va en Fase 1.

### D-0.2 403 + refresh fallido por red ≠ sesión vencida
- **Decisión**: en el interceptor, si el refresh de revalidación falla con `isNetworkError`, se rechaza la request original, se reporta a conectividad (`degraded`) y no se toca la sesión. Solo un 401 del refresh marca sesión vencida.
- **Alternativa descartada**: reintentar el refresh en bucle dentro del interceptor; bloquearía todas las requests en vuelo.

### D-0.3 Timeouts y clasificación de errores de red
- **Decisión**: `timeout: 20000` en la instancia `api` y `120000` en `postMultipart`/`patchMultipart`. `isNetworkError(error)` = sin `response`, `ECONNABORTED`, `ERR_NETWORK`, 502/503/504 y 520–524 (Cloudflare).
- **Alternativa descartada**: `AbortSignal.timeout` por llamada; disperso y fácil de olvidar.

### D-0.4 Sin toasts por errores de red; un banner
- **Decisión**: el interceptor no muestra toast si `isNetworkError`; el banner global refleja el estado. Los errores de negocio (4xx con mensaje) siguen con toast/`notify` como hoy.
- **Alternativa descartada**: deduplicar toasts por texto; sigue siendo ruidoso y no comunica "estado" sino "evento".

### D-0.5 Una sola fuente de verdad de conectividad (D8)
- **Decisión**: `lib/offline/connectivity.ts` con estados `online | degraded | offline`, alimentado por `navigator.onLine`, eventos `online`/`offline`, errores reales de axios y un heartbeat a `GET /api/eval-col/health` (BE-4; fallback `HEAD` a un endpoint de auth). Heartbeat cada 30 s online, 10 s degradado, backoff hasta 60 s offline. Degradado = 2+ errores de red en 60 s o latencia > 4 s. Histéresis: offline→online exige 2 heartbeats OK separados 3 s; el banner tarda 1,5 s en aparecer. Portal cautivo: el heartbeat valida `content-type: application/json` y un campo conocido.
- **Alternativa descartada**: solo `navigator.onLine`; es `true` en portales cautivos y con el gateway caído.

### D-0.6 Reintentos de queries
- **Decisión**: `retry: (count, err) => isNetworkError(err) && count < 2`, `networkMode: "online"` explícito, resto de defaults igual.
- **Alternativa descartada**: `networkMode: "offlineFirst"`; tiene sentido solo con persistencia (Fase 1).

### D-0.7 Idempotency-Key desde ya
- **Decisión**: toda mutación manda `Idempotency-Key: <uuid v4>`; el gateway la ignora hasta BE-1 (Fase 2). Permite medir y probar el header antes de depender de él.
- **Alternativa descartada**: agregarla recién con la outbox; obligaría a tocar todas las mutaciones dos veces.

### D-0.8 Worker sin cache de `/api`
- **Decisión**: el Worker agrega `Cache-Control: no-store` a las respuestas `/api` (BE-10) para que ningún intermediario ni el futuro SW las guarde.

## Risks / Trade-offs

- **El usuario cree que tiene sesión y no la tiene** (refresh caído por red con cookie vencida) → al volver la red el 401 sigue el flujo normal de sesión vencida.
- **Timeout de 20 s corta requests legítimamente lentas** (reportes, consolidaciones) → `downloadReport` usa su propia instancia y queda fuera; las lecturas pesadas de informes se miden en `test` antes de cerrar la fase; se permite override por llamada.
- **Banner con falsos positivos** → histéresis y retardo de 1,5 s; métricas de frecuencia de `degraded` (§13).
- **Heartbeat añade tráfico** → endpoint liviano sin auth, intervalo 30 s solo con la pestaña visible.
- **Reintentos duplican lecturas POST** → solo lecturas (las mutaciones no se reintentan en esta fase).

## Migration Plan

1. BE-4 y BE-10 se despliegan primero (compatibles hacia atrás).
2. PR de front a `dev` (CI), validación en `test` con DevTools "Offline" y "Slow 3G".
3. Criterio de aceptación: recargar `/app/planeador/actividades` sin red no lleva a `/login`; un 403 con red caída no limpia cache; 0 toasts repetidos de "Network Error".

### Rollback
- Revert del PR: la fase no persiste estado ni registra Service Worker.
- El **kill-switch del Service Worker** (§11.6 del plan: build de emergencia con `sw.ts` que hace `self.registration.unregister()`, borra caches y `clients.navigate`, sin tocar IndexedDB; `/sw.js` servido con `Cache-Control: no-cache`) no aplica todavía porque esta fase no instala SW; se especifica en `add-offline-reads`. El flag remoto `VITE_APP_OFFLINE = off|read|full` / `GET /api/eval-col/config/offline` se crea en Fase 1; en Fase 0 el único control es el revert.

## Open Questions

- P13: ¿kill-switch por endpoint de configuración, por variable de build o ambos? (propuesta: ambos; decide Fase 1).
- ¿BE-4 vive en eval-col o en el gateway? Debe detectar el 503 solo de eval-col (§9.1 caso 7).
- Preguntas del plan que afectan fases siguientes y no bloquean esta: P6 (datos de menores, **bloqueador** de escritura fuera del piloto), P15–P20 (ver `add-offline-writes-asistencia-planilla` y `add-offline-planeador-sagas`).

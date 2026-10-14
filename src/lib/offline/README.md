# `lib/offline` — resiliencia de red

Change OpenSpec: `openspec/changes/add-offline-resilience` (plan completo en `docs/offline/PLAN-offline.md`).

## Conectividad (Fase 0)

- `connectivity.ts` — `connectivityStore` (`getState()`, `subscribe()`, `reportNetworkFailure(reason?)`, `reportSuccess()`, `start()`/`stop()`): estados `online | degraded | offline`, heartbeat a `GET /api/eval-col/health` (sin auth, `no-store`), histéresis y detección de portal cautivo. También alimenta el `onlineManager` de TanStack Query. Sin dependencias de features.
- `use-connectivity.ts` — `useConnectivity()` (`useSyncExternalStore`).
- `components/layout/offline-banner.tsx` — banner con `role="status"`; lo monta `ProtectedLayout` y arranca/detiene el heartbeat.
- `api-client.ts` reporta al store los errores de red (`reportNetworkFailure`) y las respuestas OK (`reportSuccess`).

## Port a `front_pigse` (tarea 8.1)

**No** se modifica PIGSE sin pedido explícito. Si se pide, copiar:

1. `src/lib/offline/connectivity.ts` y `use-connectivity.ts` tal cual; ajustar `HEARTBEAT_PATH` al health del gateway de PIGSE (debe responder JSON con `status`, `ok` o `estado`, sin auth).
2. `offline-banner.tsx`: revisar `OFFLINE_CAPABLE_PREFIXES` (rutas que funcionan sin red en PIGSE) y los tokens de color (`navy-22`, `yellow-22`).
3. Íconos `CloudOffIcon`/`CloudCheckIcon`/`CloudSyncIcon`/`CloudAlertIcon` en `components/ui/icons.tsx`.
4. Agregar el health a `UNAUTHENTICATED_ENDPOINTS`/`PROBE_ENDPOINTS` del `api-client` y el handler MSW.
5. Llevar los tests `connectivity.test.ts`. Hacerlo en un PR propio de PIGSE (tarea 8.2).

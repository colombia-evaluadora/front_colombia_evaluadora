# Tasks: Resiliencia de red (Fase 0)

## 1. Sesión
- [x] 1.1 `getUser()` (`src/lib/auth.ts`) devuelve `null` solo ante 401/403 del refresh y lanza `NetworkSessionError` ante error de red
- [x] 1.2 `hasSession` reintenta 3 veces con backoff (1 s, 2 s, 4 s) ante `NetworkSessionError`
- [x] 1.3 `beforeLoad` de `/app` lanza el error de red al `ErrorPage` (copy "No pudimos comunicarnos con el servidor" + "Reintentar") en lugar de redirigir a `/login`
- [x] 1.4 Interceptor: un 403 cuyo refresh de revalidación falla por red no marca sesión vencida, no limpia cache y reporta `degraded`

## 2. Cliente HTTP
- [x] 2.1 `timeout: 20000` en `api`; `120000` en `postMultipart`/`patchMultipart`; override por llamada
- [x] 2.2 `isNetworkError(error)` exportado desde `src/lib/api-client.ts`
- [x] 2.3 Sin toast global para errores de red; se reportan al `connectivityStore`
- [x] 2.4 Header `Idempotency-Key` (UUID v4) en toda mutación (POST/PUT/PATCH/DELETE que no sea lectura `api.query`/`postRows`)
- [x] 2.5 Agregar `/eval-col/health` a `UNAUTHENTICATED_ENDPOINTS` y `PROBE_ENDPOINTS`

## 3. Queries
- [x] 3.1 `queryConfig`: `retry: (n, e) => isNetworkError(e) && n < 2` y `networkMode: "online"`
- [x] 3.2 Revisar mutaciones: sin `retry` automático

## 4. Conectividad y banner
- [x] 4.1 `src/lib/offline/connectivity.ts` (sin dependencias de features) con estados, heartbeat, histéresis y portal cautivo
- [x] 4.2 Hook `useConnectivity()`
- [x] 4.3 `OfflineBanner` en `components/layout` con estados offline y degradado (copy de la spec), `role="status"` y `aria-live="polite"`
- [x] 4.4 Íconos `CloudOffIcon`, `CloudCheckIcon`, `CloudSyncIcon`, `CloudAlertIcon` en `components/ui/icons.tsx`

## 5. Navegación e invalidaciones
- [x] 5.1 `isAlwaysAllowedPath` incluye `/app/pendientes` (ruta que crea la Fase 2)
- [x] 5.2 X1: crear/eliminar unidad invalida `unidades.tabs(alcance)`
- [x] 5.3 X2: calificar celda, bulk y observar invalidan `actividad.calificaciones(id)`
- [x] 5.4 Verificar que cada key invalidada prefija las keys de lectura (CLAUDE.md §11)

## 6. Worker y backend
- [x] 6.1 BE-10: `worker/index.js` agrega `Cache-Control: no-store` a respuestas `/api`
- [x] 6.2 BE-4: `GET /eval-col/health` liviano sin auth (PR en backend, sin esquema)
- [x] 6.3 Handler MSW para `/eval-col/health` en modo mock

## 7. Pruebas
- [x] 7.1 Proyecto Vitest `unit` (node + `fake-indexeddb`) y script `pnpm test:unit`
- [x] 7.2 Paso `pnpm test:unit` en `.github/workflows/ci.yml`
- [x] 7.3 Unit: `isNetworkError`, `getUser` (401 vs red), histéresis y portal cautivo de `connectivity`
- [x] 7.4 Integración (Vitest + MSW con `HttpResponse.error()`, `delay("infinite")`, 403/503): 403 con refresh caído no limpia cache; timeout dispara `degraded`
- [x] 7.5 E2E Playwright (`context.setOffline`): recarga offline en `/app/planeador/actividades` no va a `/login`; 0 toasts repetidos

## 8. PIGSE
- [x] 8.1 Documentar en `lib/offline/README` (o comentario de módulo) qué copiar a `front_pigse`; **no** modificar PIGSE sin pedido explícito
- [ ] 8.2 Si se pide el port: aplicar 1.x–4.x en `front_pigse` en su propio PR

## 9. Cierre
- [x] 9.1 `pnpm exec tsc -b --noEmit`, `pnpm lint`, `pnpm test:unit` en verde
- [ ] 9.2 Validación manual en `test` con DevTools Offline / Slow 3G
- [x] 9.3 Actualizar `docs/offline/PLAN-offline.md` con el cierre de la fase

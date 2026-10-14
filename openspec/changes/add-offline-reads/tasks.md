# Tasks: Lectura offline (Fase 1)

## 1. App shell
- [x] 1.1 `vite-plugin-pwa` con `injectManifest` y `src/sw.ts` (precache de `dist/`, `navigateFallback` excepto `/api`)
- [x] 1.2 Manifest e íconos; `/sw.js` con `Cache-Control: no-cache` en el Worker
- [x] 1.3 No registrar el SW cuando `ENABLE_API_MOCKING` está activo
- [x] 1.4 Toast de nueva versión con bloqueo durante sync
- [x] 1.5 Kill-switch: flag remoto + `VITE_APP_OFFLINE`, y build de emergencia autodesregistrable (documentar procedimiento)
- [x] 1.6 Medir tamaño del precache; si > 15 MB excluir chunks de vistas solo en línea

## 2. Persistencia
- [x] 2.1 `lib/offline/db.ts` (`ce-offline` v1: `meta`, `session`, `queries`)
- [x] 2.2 `lib/offline/query-persister.ts`: lista blanca `meta.offline`, buster por usuario, throttle 1 s, entrada ≤ 2 MB, presupuesto 50 MB LRU
- [x] 2.3 `meta.offline` en ~40 queries y `persistSelect` para minimizar datos de estudiantes
- [x] 2.4 Restaurar el persister antes de `router.load()`

## 3. Sesión offline
- [x] 3.1 `session` persistida (`sub`, `name`, `roles`, `menuSnapshot`, `permisos`, `lastOnlineAuthAt`), nunca el token
- [x] 3.2 `hasSession` acepta usuario offline; login con "Continuar sin conexión como {nombre}"
- [x] 3.3 Menú y permisos con TTL 30 días; `sin-acceso` con aviso de menú viejo

## 4. UX
- [x] 4.1 `useOnlineOnly` en todas las vistas solo en línea (§8)
- [x] 4.2 Empty states y badge "Datos del …"
- [x] 4.3 Diálogo "Preparar para usar sin conexión" + `navigator.storage.persist()`
- [x] 4.4 Modo equipo compartido (checkbox en login, marcado por defecto mientras P6 esté pendiente)

## 5. Limpieza
- [x] 5.1 Logout borra `queries` y `session` del `sub`
- [x] 5.2 Login de otro usuario no lee filas ajenas

## 6. Pruebas
- [x] 6.1 Unit: persister selectivo, buster, limpieza por usuario
- [ ] 6.2 E2E: preparar → modo avión → recargar → navegar planeador/planilla/asistencia/referentes
- [ ] 6.3 E2E: `/verificar/b` nunca muestra datos cacheados (C-80)
- [ ] 6.4 Manual en Chrome Android, Safari iOS, Chrome Windows, Firefox

## 7. PIGSE
- [ ] 7.1 Mantener `lib/offline/*` sin dependencias de features; port a `front_pigse` solo con pedido explícito

Notas Fase 1 (tareas 1.1–1.6): precache medido en 324 entradas / 10,8 MB (< 15 MB, no se excluyen chunks). Kill-switch: `VITE_APP_OFFLINE`, flag remoto opcional (falla seguro si 404) y build de emergencia en `docs/offline/KILL-SWITCH.md`. `isSyncInProgress()`/`notifySyncIdle()` en `lib/offline/sw-update.ts` quedan para cablear en la Fase 2.

# Tasks: Centro de notificaciones

## 0. Decisiones previas (bloqueantes)
- [ ] 0.1 Aprobación explícita del esquema `notificacion` en `notification-service`
- [ ] 0.2 Definir tipos visibles por rol (docente, coordinador, estudiante, acudiente)

## 1. Contrato
- [ ] 1.1 Documentar endpoints `/notificaciones/**` (forma snake_case de filas y cursor)
- [ ] 1.2 Documentar el mensaje `notificaciones.eventos` y los eventos WS `notification.*`
- [ ] 1.3 Catálogo inicial de tipos (categoría, prioridad, canales por defecto, silenciable, agrupación, retención)

## 2. Backend (repo `sso`, fuera de este repo)
- [ ] 2.1 Tabla `notificacion` e índices (tras aprobación)
- [ ] 2.2 Consumidor con deduplicación por `dedupeKey` y agrupación
- [ ] 2.3 Controlador REST y ruta en api-gateway
- [ ] 2.4 Publicación de `notification.*` al gateway de tiempo real
- [ ] 2.5 Job de purga por retención

## 3. Front
- [x] 3.1 `features/notificaciones/api/query` (`useNotificacionesInfiniteQuery`, `useContadorQuery`) con mapeo `toNotificacion`
- [x] 3.2 Mutaciones leída / no leída / leer todas / archivar con invalidación de `["notificaciones"]`
- [x] 3.3 Campana en el header con contador y dropdown de 10
- [x] 3.4 Ruta `/app/notificaciones` (`paths.ts` + `createRoute` + `routeTree` + miga completa)
- [x] 3.5 Filtros con sintaxis Gmail y schema `validateSearch` con `.catch(undefined)`
- [ ] 3.6 Suscripción a `notification.*` con `useRealtimeEvent`
- [x] 3.7 `meta.offline` de solo lectura para lista y contador
- [x] 3.8 Handlers MSW y datos fixture
- [x] 3.9 `pnpm exec tsc -b --noEmit` y `pnpm lint` en verde

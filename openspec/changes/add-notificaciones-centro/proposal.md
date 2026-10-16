# Change: Centro de notificaciones general

## Why

Hoy los eventos relevantes (validación del coordinador en el planeador, solicitudes Regla 75 de asistencia, boletines, asignaciones académicas, comunicados) se descubren **por banners o polling dentro de cada pantalla**. No hay campana global, ni bandeja persistente, ni leído/no leído: `notification-service` solo registra **entregas** (`notification_log`) y el front solo tiene la campana del prototipo de chat (`notificaciones-chat.tsx`, solo mock). El chat y las llamadas dependen de una bandeja común, así que se construye primero.

Fuente de diseño: [`PLAN-comunicaciones.md`](../../../PLAN-comunicaciones.md) §11.1–§11.5, §13.2 (change 2), §13.3 `notificaciones-centro`.

## What Changes

- **Bandeja persistente** en `notification-service`: una fila `notificacion` por usuario con `id` UUID compartido por inbox, `notification_log`, payload push y evento WS (**cambio de esquema pendiente de aprobación**).
- Consumo de `notificaciones.eventos` (RabbitMQ) con `{ tipo, destinatarios, deepLink, datos, dedupeKey }`, deduplicación por `dedupeKey` y agrupación por `agrupacion_key`.
- Endpoints: `GET /notificaciones?cursor&tipo&estado`, `GET /notificaciones/contador`, `PATCH /notificaciones/{id}/leida`, `PATCH /notificaciones/{id}/no-leida`, `POST /notificaciones/leer-todas { tipo? }`, `PATCH /notificaciones/{id}/archivar`.
- Eventos de tiempo real `notification.created|read|read_all` sobre el gateway de `add-tiempo-real-gateway`.
- Catálogo de tipos (categoría, prioridad, canales por defecto, silenciable, regla de agrupación, retención).
- Front: campana en el header con contador (`99+`) y dropdown de las 10 últimas; página `/app/notificaciones` (lista infinita por cursor, filtros con la sintaxis Gmail existente, agrupación por día, acciones por fila, clic → deep link + leída).
- Offline: lista y contador cacheados de solo lectura según el plan offline.
- Retención: leídas 90 días, no leídas 180 días (configurable) con job de purga.

## Impact

- Specs: nueva `notificaciones-centro`.
- Código front: `src/features/notificaciones/*` (api/query, mutations, components, pages), `src/components/layout` (campana), `src/config/paths.ts`, `src/router.tsx` (ruta + `routeTree` + miga), `src/config/breadcrumbs.ts`, handlers MSW en `src/mocks/handlers/notificaciones`.
- Backend `sso`: tablas nuevas en la BD de `notification-service` (**pendiente de aprobación**; se ajusta la migración propietaria, no una nueva fuera de la norma), consumidor y controlador REST, ruta `/notificaciones/**` en api-gateway.
- Depende de: `add-tiempo-real-gateway`.

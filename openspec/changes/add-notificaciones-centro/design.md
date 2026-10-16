# Design: Centro de notificaciones

Fuente completa: [`PLAN-comunicaciones.md`](../../../PLAN-comunicaciones.md) §11. Restricción transversal: **solo componentes self-hosted**.

## Context

- `notification-service` consume colas por canal (`EMAIL`, `SMS`, `PUSH`) con `NotificationMessage(channel, recipient, templateId, payload)` y guarda `notification_log` (entrega) y `provider_config`. No tiene inbox, ni estado de lectura, ni endpoints para el usuario.
- El front no tiene campana global; el prototipo de chat hace polling de 60 s solo con MSW.
- Existe la sintaxis de búsqueda estilo Gmail (`components/search/query-syntax.ts`) y el patrón de lista de `CLAUDE.md` §7.

## Goals / Non-Goals

**Goals**
- Una sola bandeja para todos los dominios, con leído sincronizado entre pestañas y dispositivos.
- Contador correcto en < 2 s tras un evento.
- Deep link que lleva al objeto y marca la notificación como leída.

**Non-Goals**
- Preferencias y horario silencioso (→ `add-notificaciones-preferencias`).
- Web Push (→ `add-notificaciones-push-webpush`).
- Emisión desde planeador/asistencia/informes (→ `add-notificaciones-eventos-dominio`).
- Email digest (se activa con preferencias).

## Decisions

### D-2.1 Separar notificación (inbox) de entrega (canal)
- **Decisión**: tabla `notificacion` (id UUID, fk_usuario, app, tipo, categoria, titulo, cuerpo_corto, deep_link, datos jsonb, agrupacion_key, prioridad, creada_en, leida_en, archivada_en, expira_en) en la BD de `notification-service`; `notification_log` sigue siendo el log por canal y referencia el mismo UUID.
- **Alternativa descartada**: reutilizar `notification_log` como inbox; mezcla estado de entrega por canal con estado de lectura del usuario y duplica filas por canal.
- **Pendiente**: aprobación explícita del esquema (pregunta abierta 1). No se escribe ninguna migración hasta el OK.

### D-2.2 Inbox en `notification-service`, no en `comms-service` ni en `/eval-col`
- **Decisión**: el servicio que ya decide canales y entrega es el dueño del inbox.
- **Alternativa descartada**: tablas en el esquema de eval-col servidas por el motor de queries; el motor no publica eventos tras commit y no conoce el consumo de RabbitMQ.

### D-2.3 Paginación por cursor
- **Decisión**: `GET /notificaciones?cursor=<creada_en,id>&limit=30`; front con `useInfiniteQuery`, key `["notificaciones", "lista", filtros]` y `["notificaciones", "contador"]`.
- **Alternativa descartada**: offset (`PAGE_INDEX`); inestable con inserciones en vivo.

### D-2.4 Agrupación en escritura
- **Decisión**: si existe una no leída con la misma `agrupacion_key` en la ventana del tipo (p. ej. 10 min para reacciones), se actualiza (`actores`, `conteo`) en lugar de insertar.
- **Alternativa descartada**: agrupar solo en el cliente; el contador y el push quedarían inflados.

### D-2.5 Eventos de tiempo real
- **Decisión**: `notification.created { id, tipo, titulo, ... }`, `notification.read { id }`, `notification.read_all { tipo? }` en el tópico `user:<sub>`; el cliente hace `setQueryData` sobre lista y contador.
- **Alternativa descartada**: invalidar todo en cada evento; genera ráfagas de requests con muchas pestañas abiertas.

### D-2.6 UI
- **Decisión**: campana en el header (Base UI `Popover`, íconos de `@/components/ui/icons`), `aria-live="polite"`; página `/app/notificaciones` con `TableScreen`-like de lista (no tabla) y filtros `tipo:(…) estado:(No leídas)`.
- **Alternativa descartada**: reutilizar `notificaciones-chat.tsx` tal cual; está acoplado al dominio del chat.

### D-2.7 Offline
- **Decisión**: lista y contador con `meta.offline` (solo lectura, banner "sin conexión"); marcar leído offline queda deshabilitado en esta fase.
- **Alternativa diferida**: encolar `PATCH .../leida` en el outbox offline (idempotente por id) cuando el plan offline lo habilite.

## Risks / Trade-offs

- Volumen de filas por usuario → índices `(fk_usuario, leida_en, creada_en desc)` y purga diaria.
- Contenido sensible de menores en `titulo`/`cuerpo_corto` → las plantillas de tipo deciden el texto; nunca datos de salud ni documentos.
- Divergencia mock/real → contrato congelado en este change antes del back.

## Migration Plan

1. Aprobación de esquema y contrato.
2. Backend en `test` + MSW en `dev`.
3. Front detrás del código de menú `NOTIFICACIONES` (`useMenuPermission`) para pilotos.

### Rollback
Quitar el ítem de menú y ocultar la campana; los eventos siguen en `notification_log`.

## Open Questions

Decisiones pendientes del usuario (PLAN §10):

1. **Aprobación de esquema**: tablas `notificacion` (y luego preferencias/suscripciones) en la BD de `notification-service`, ajustando su migración propietaria.
2. **comms-service**: confirmar que el inbox vive en `notification-service` y no en el servicio nuevo.
3. **Política de menores**: qué tipos recibe un estudiante y un acudiente; si el acudiente ve notificaciones del estudiante.
4. **Retención**: 90/180 días propuestos; ¿exportación ante requerimiento legal?
5. **WS vs Centrifugo**: el contrato de eventos es el mismo; afecta solo la publicación.
6. **iOS PWA**: sin impacto en este change (in-app siempre disponible).
7. **ClamAV**: no aplica.

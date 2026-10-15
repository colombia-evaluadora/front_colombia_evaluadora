# Design: Eventos de dominio

Fuente completa: [`PLAN-comunicaciones.md`](../../../PLAN-comunicaciones.md) §11.1–§11.3. Restricción transversal: **solo componentes self-hosted** (RabbitMQ existente).

## Context

- Las escrituras de planeador, asistencia e informes pasan por el motor `/eval-col` (SQL declarativo en `query-service-postgres`); informes IA pasan por `ai-control-service`.
- Las solicitudes Regla 75 se generan en el servidor (funciones PL/pgSQL).
- El front ya conoce los destinos de deep link (rutas de `paths.ts`).

## Goals / Non-Goals

**Goals**
- Cada evento de negocio relevante produce exactamente una notificación por destinatario.
- Las pantallas afectadas se actualizan sin polling.

**Non-Goals**
- Notificaciones del chat y de llamadas (→ changes de comunicaciones).
- Notificaciones de cuenta (activación, recuperación): siguen por email directo.

## Decisions

### D-5.1 Publicación en el backend tras commit
- **Decisión**: los eventos se publican desde el backend cuando la transacción confirma (outbox `toutbox_evento` + publicador, o `LISTEN/NOTIFY` hacia un publicador).
- **Alternativa descartada**: que el front llame a un endpoint "notificar" tras la mutación; se pierde si la pestaña se cierra o la red cae (plan offline) y permite falsificar avisos.
- **Pendiente**: aprobación de la tabla outbox (pregunta abierta 1).

### D-5.2 `dedupeKey` determinista
- **Decisión**: `dedupeKey = <tipo>:<pk del objeto>:<versión o estado>`; reintentos del publicador no duplican.
- **Alternativa descartada**: UUID aleatorio por publicación; duplica ante reintentos.

### D-5.3 Destinatarios resueltos en el servidor
- **Decisión**: el productor resuelve destinatarios con las mismas reglas de permisos (rol × sede × jornada; coordinador del grupo).
- **Alternativa descartada**: difundir a un rol entero y filtrar en el cliente; filtra datos a usuarios sin permiso.

### D-5.4 El evento también invalida
- **Decisión**: el front, al recibir `notification.created` de un tipo de dominio, invalida las keys del dominio (p. ej. `["planeador", "validacion-coordinador"]`) además de la bandeja.
- **Alternativa descartada**: mantener el polling actual; costo y latencia.

## Risks / Trade-offs

- Funciones PL/pgSQL sin hook de publicación → empezar por outbox con trigger por tabla.
- Ruido para coordinadores con muchos docentes → agrupación por tipo y grupo (`agrupacionKey`).

## Migration Plan

1. Planeador (validación) como piloto; luego asistencia, informes y establecimiento.
2. Retirar el polling de cada pantalla solo cuando su evento esté en `test`.

### Rollback
Desactivar el publicador por tipo; las pantallas conservan su consulta manual.

## Open Questions

Decisiones pendientes del usuario (PLAN §10):

1. **Aprobación de esquema**: `toutbox_evento` (o triggers) en `sso`.
2. **comms-service**: ¿el publicador del outbox vive en `comms-service`, en `notification-service` o en `query-service-postgres`?
3. **Política de menores**: ¿estudiantes y acudientes reciben eventos de informes (boletín generado)?
4. **Retención** por tipo de evento de dominio.
5. **WS vs Centrifugo**: sin impacto en el contrato.
6. **iOS PWA**: sin impacto.
7. **ClamAV**: no aplica.

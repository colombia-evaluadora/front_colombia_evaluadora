# Change: Preferencias de notificaciones y horario silencioso

## Why

Con la bandeja central cada usuario recibiría todos los tipos por todos los canales. Docentes, acudientes y sobre todo estudiantes necesitan decidir qué reciben por push o email, y la institución necesita un **horario silencioso** (p. ej. 8 pm–6 am para estudiantes) que proteja a menores sin perder la notificación en la bandeja.

Fuente de diseño: [`PLAN-comunicaciones.md`](../../../PLAN-comunicaciones.md) §6 (Horario), §11.2, §11.4, §13.2 (change 3), §13.3 `notificaciones-preferencias`.

## What Changes

- Tablas `notificacion_preferencia` (fk_usuario, tipo, in_app, push, email, silenciado_hasta) y `notificacion_horario_silencioso` (días, desde, hasta, zona) en la BD de `notification-service` (**cambio de esquema pendiente de aprobación**).
- Política institucional por rol (horario silencioso por defecto para estudiantes, tipos no silenciables) que el usuario no puede relajar.
- `GET/PUT /notificaciones/preferencias`; el consumidor aplica preferencias, silencios y horario antes de despachar a push/email; la bandeja **siempre** recibe la notificación.
- Entrega diferida: lo retenido por horario silencioso se despacha al terminar el horario, salvo prioridad `URGENTE_INSTITUCIONAL`.
- Email digest diario de no leídas para quien lo active (provider de email existente).
- Front: página `/app/notificaciones/preferencias` con matriz tipo × canal, horario silencioso, tipos silenciados temporalmente; acción "Silenciar este tipo" desde la bandeja.

## Impact

- Specs: nueva `notificaciones-preferencias`.
- Código front: `src/features/notificaciones/{api,components,pages}` (preferencias), `paths.ts`, `router.tsx`, migas, handlers MSW.
- Backend `sso`: tablas nuevas (**pendiente de aprobación**), evaluación de reglas en el consumidor, job de entrega diferida y digest.
- Depende de: `add-notificaciones-centro`.

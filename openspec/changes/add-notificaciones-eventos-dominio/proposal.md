# Change: Eventos de dominio que generan notificaciones

## Why

Con la bandeja lista, faltan los productores. Hoy los eventos clave se descubren por banners y polling en cada pantalla: validación del coordinador en el planeador (`resolver-validacion-coordinador.ts`, `use-validacion-coordinador-query.ts`), solicitudes de corrección Regla 75 de asistencia (`/eval-col/aprobaciones/pendientes`), boletines y observaciones IA de informes, y cambios en asignaciones académicas.

Fuente de diseño: [`PLAN-comunicaciones.md`](../../../PLAN-comunicaciones.md) §11.1, §11.3, §13.2 (change 5).

## What Changes

- Contrato del mensaje `notificaciones.eventos` por tipo: `{ tipo, destinatarios, deepLink, datos, dedupeKey, agrupacionKey?, prioridad }`.
- Tipos iniciales:
  - Planeador: `PLANEADOR_ENVIADA_VALIDACION` (al coordinador), `PLANEADOR_APROBADA`, `PLANEADOR_RECHAZADA` (al docente), `PLANEADOR_INTERCAMBIO`.
  - Asistencia: `ASISTENCIA_SOLICITUD_CREADA` (al coordinador), `ASISTENCIA_SOLICITUD_RESUELTA` (al docente).
  - Informes: `INFORME_BOLETIN_GENERADO`, `INFORME_OBSERVACIONES_IA_LISTAS`, `INFORME_CONSOLIDACION_TERMINADA`.
  - Establecimiento: `ASIGNACION_ACADEMICA_CAMBIADA`, `ROL_ASIGNADO`.
- Publicación desde el backend tras commit (outbox o trigger + publicador) — nunca desde el front, para no depender de que la pestaña siga abierta.
- Deep links a rutas existentes (`/app/planeador/actividades?actividad=`, `/app/asistencia/...`, `/app/gestion-academica/informes?...`).
- Front: invalidar las queries del dominio al recibir el evento correspondiente (p. ej. validación del coordinador) y retirar el polling por pantalla donde exista.

## Impact

- Specs: nueva `notificaciones-eventos`.
- Código front: mapa tipo → ícono/etiqueta en `features/notificaciones/api/ui-mappings.ts`; suscripciones `useRealtimeEvent` en planeador, asistencia e informes; corrección de las invalidaciones conocidas del planeador (`["planeador","actividades"]` no prefija `actividades-mias`).
- Backend `sso`: publicación de eventos desde las funciones/servicios de planeador, asistencia, informes y establecimiento. Si se usa outbox en Postgres, **requiere aprobación de esquema** (`toutbox_evento`).
- Depende de: `add-notificaciones-centro`.

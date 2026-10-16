# Change: Resto del alcance offline (Fase 4)

## Why

Tras el piloto de escrituras (Fase 2) quedan escrituras de menor frecuencia que los docentes hacen en el aula (enunciados y evidencias de referentes curriculares, activar referentes, observaciones cualitativas de informes) y consultas que hoy se bloquean sin red aunque sus datos ya se persisten (horario y asignaciones académicas, historial del informe consolidado).

Fuente de diseño: [`docs/offline/PLAN-offline.md`](../../../docs/offline/PLAN-offline.md) §8, §11 Fase 4, §13.

## What Changes

- Outbox para referentes curriculares: crear/editar/eliminar enunciados y evidencias (`referente.enunciado.*`, `referente.evidencia.crear`) y activar/inactivar (`referente.estado`; inactivar sigue exigiendo red porque consulta el impacto).
- Outbox para observaciones cualitativas de informes guardadas a mano (`informe.observacion`, fusiona guardar/eliminar por matrícula y período). Generar con IA sigue solo en línea (resuelve P8 a favor de la edición manual).
- Solo consulta sin red: lista de periodos y edición de periodo (tabs de horario y asignaciones); guardar horario/asignaciones sigue solo en línea. Historial del informe se persiste minimizado.
- Administración (roles-menús, auditoría, sedes, funcionarios) sigue solo en línea.
- Cierre: matriz Playwright Chromium/Firefox/WebKit (`pnpm test:e2e:matrix`), checklist manual multi-navegador, documento de métricas go/no-go y plan del port a PIGSE (solo documento).
- Fuera de alcance (queda para la Fase 3 / backlog): unidades y ponderaciones offline, cache de imágenes de recursos, envío de telemetría al backend.

## Impact

- Specs: nuevas `referentes-offline`, `informes-offline`; modifica `navigation-access` (excepciones de solo consulta).
- Código: `curricular-references/api/mutations/*`, `reports/api/mutations/use-observacion.ts`, `lib/offline/online-only-paths.ts`, `features/offline/register-handlers.ts`.
- Backend: sin cambios (los endpoints existentes ya son idempotentes o de reemplazo).

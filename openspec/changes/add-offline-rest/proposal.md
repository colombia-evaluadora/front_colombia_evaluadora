# Change: Resto del alcance offline (Fase 4, opcional)

## Why

Tras el piloto y las sagas del planeador quedan escrituras de menor frecuencia que los docentes piden en el aula: unidades temáticas y sus ponderaciones, y la cache de imágenes de recursos para consultarlos sin red.

Fuente de diseño: [`docs/offline/PLAN-offline.md`](../../../docs/offline/PLAN-offline.md) §8.8 (unidades, vista previa de recursos), §9.3 C-39, §11 Fase 4, §13.

## What Changes

- Handlers `unidad.crear`, `unidad.editar` y `unidad.ponderaciones` con versión (BE-3B aprobada en Fase 3).
- Observaciones cualitativas de informes offline **solo si** se resuelve P8 a favor (propuesta actual: no en v1).
- Cache opcional de imágenes de recursos (por id de archivo, nunca por URL de vista con token).
- Métricas finas y telemetría anónima opt-out (P11).

## Impact

- Specs: nueva `planeador-unidades-offline`.
- Código: mutaciones de unidades, `lib/offline/outbox/handlers/unidad-*.ts`, SW (cache de imágenes).
- Decisiones §0 vigentes: 10 MB por archivo, 150 MB / 60 archivos; P6 sigue limitando a piloto.

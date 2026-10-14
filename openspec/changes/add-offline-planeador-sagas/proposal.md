# Change: Sagas del planeador offline (Fase 3)

## Why

Crear y editar actividades son guardados multi-paso orquestados en el componente de página (B8): si el navegador se cierra a mitad no hay registro de qué falta, y no pueden encolarse como una sola operación. Moverlos a handlers de outbox los hace reanudables online y habilita la creación offline.

Fuente de diseño: [`docs/offline/PLAN-offline.md`](../../../docs/offline/PLAN-offline.md) §6.5–6.8; §8.8; §9.3 C-33..36; §9.9 C-81..91; §10 BE-3/BE-6; §11 Fase 3.

## What Changes

- Handlers `actividad.crear` y `actividad.editar` que se expanden en ops encadenadas copiando el **orden real** del código (crear: actividad → materiales → instrumento → adaptaciones → criterios como ops hermanas; editar: unlink/link → PUT actividad con evidencias y criterios → materiales → instrumento → estudiantes → adaptaciones) (P19).
- Ids temporales `tmp:<uuid>`, `idmap`, reescritura de payloads al enviar y guard que impide que `tmp:` llegue al backend.
- Borradores en IndexedDB (`drafts`) que guardan Blobs (reemplazan `actividad-form-draft.ts` en sessionStorage).
- PUT de reemplazo total con refetch del detalle antes de armar el payload; resolvers de catálogo desde cache persistido.
- Recursos offline hasta 10 MB; de 10 a 20 MB solo online (P18).
- Backend: **BE-3 opción B aprobada** (columna `VERSION`/`UPDATED_AT` en `TACTIVIDAD` y `TUNIDAD`, PR propio en `sso` ajustando la migración dueña de cada tabla, revisión antes del merge); BE-6 limpieza de huérfanos.

## Impact

- Specs: `planeador-actividades`.
- Código: `planeador-crear-actividad-page.tsx`, `planeador-editar-actividad-page.tsx`, `form-editar-actividad.tsx`, mutaciones del planeador, `lib/offline/outbox/handlers/actividad-*.ts`, `lib/offline/drafts.ts`.
- Preguntas: P18, P19; P6 sigue limitando a piloto.
- Aceptación: crear actividad con 2 recursos, rúbrica y adaptaciones offline, reiniciar el equipo y reconectar → todo creado una vez, en orden, con archivos.

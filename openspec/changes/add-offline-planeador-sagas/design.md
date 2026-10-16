# Design: Sagas del planeador offline (Fase 3)

## Arquitectura

- **Mecánica común** (`src/lib/offline/outbox/`, sin dependencias de features):
  - `saga.ts`: metadatos del paso dentro del payload (`saga: { id, target, titulo, label, step, total }`), `enqueueSaga` (ops encadenadas por `dependsOn`, clave `saga:<id>:<paso>`), mapa de ids temporales persistido en `meta` (`outbox-idmap:<sub>`), vista agregada (`groupSagas`, `sagaStatus`, `sagaStatusFor`) y acciones de UI (`retrySagaFrom`, `skipSagaStep`, `discardSaga`).
  - `tmp-id.ts`: `tmp:<uuid>`, `containsTmpId` y el guard `assertNoTmpIds` que corre como interceptor de request en `api-client.ts`.
  - `write-request.ts`: `WriteRequest` (clave, `background`, archivos del paso) que aceptan como último argumento opcional las funciones de escritura del planeador.
- **Planeador** (`src/features/planeador/offline/`): un handler por paso (`saga-handlers.ts`) que reusa la MISMA función de escritura que el guardado online; `build-sagas.ts` arma los pasos desde los valores del formulario copiando las condiciones de los `handleSubmit`; `run-saga.ts` ejecuta online-first; `fingerprint.ts` calcula la huella de versión.
- **UI**: badge de saga en las cards de actividad y unidad, franja "creadas sin conexión" en Actividades y Unidades, y pasos agrupados en `/app/pendientes` (`SagaList`) con "Reintentar desde aquí", "Omitir este paso", "Conservar mis cambios" y "Descartar lo que falta". Solo se habilitan sin red los botones de guardar actividad/unidad (y "Agregar"/"Editar" de unidades) cuando la outbox está habilitada (`useOfflineWritable`).

## Decisiones tomadas por defecto (revisables)

| # | Decisión | Detalle |
|---|---|---|
| D-F3-1 | **Online-first también para las sagas** (extiende D-F2-7). | Con red los pasos se envían desde la pantalla, en orden, cada uno con su clave fija `saga:<id>:<paso>`. Sin red, con otra saga abierta sobre la misma entidad, o si la red se cae a mitad, lo que falta se encola con las MISMAS claves y el idmap ya cargado: la outbox retoma donde quedó. Sin outbox habilitada (no piloto, compartido, kill-switch) es el envío directo de siempre. |
| D-F3-2 (P19) | **Orden real del código.** | Crear: actividad → materiales → instrumento → adaptaciones → criterios (hermanos que dependen solo del paso 0). Editar: unidad (vincular/desvincular) → PUT actividad (evidencias y criterios en el body) → materiales → instrumento → estudiantes → adaptaciones. El instrumento va después del PUT porque necesita `FK_TLV_INSTRUMENTO_EVALUACION` fijado. Estudiantes va antes que adaptaciones porque estas se filtran por los estudiantes de la actividad (regla 47). Corrige CLAUDE.md §6 (X7). |
| D-F3-3 | **En la cola la cadena es estricta.** | Un paso rechazado deja a sus dependientes `blocked` (la saga queda "Guardado parcial"). El docente puede reintentar desde ese paso, omitirlo (sus dependientes siguen) o descartar lo que falta. Online, crear sigue informando todos los fallos juntos como antes y editar se detiene en el primero. |
| D-F3-4 | **Concurrencia optimista por huella, sin cambio de esquema** (BE-3B diferido). | `TACTIVIDAD`/`TUNIDAD` no tienen columna de versión y el cambio de esquema requiere aprobación explícita. La edición encolada guarda la huella (FNV-1a de los campos editables) del detalle que vio el docente; el primer paso, al sincronizar, refetchea el detalle y si la huella cambió queda `conflict` ("Conservar mis cambios" reenvía sobre la versión actual). Online no se verifica (el docente acaba de ver la versión vigente). Cuando BE-3B se apruebe, la huella se reemplaza por `VERSION` sin tocar la UI. |
| D-F3-5 | **Rechazos de negocio con código estable.** | Regla 37 (actividad con calificaciones/observaciones) se verifica también en el refetch previo → `rejected` `ACTIVIDAD_NO_EDITABLE` con el motivo del backend. Periodo cerrado → `PERIODO_CERRADO` (código del backend de la Fase 2 o el texto del `RAISE`). Cualquier otra validación 4xx del planeador → `rejected` con el mensaje real. No se agregaron endpoints ni migraciones en `sso`: las escrituras JSON ya pasan por la `Idempotency-Key` del gateway (Fase 2). |
| D-F3-6 | **Reemplazo total preserva archivos.** | Materiales/adaptaciones ya guardados viajan por `archivoId`/`fkTarchivo`; los nuevos se copian como `File` al store `blobs` (≤ 10 MB, 3 por paso, cuotas de usuario de la Fase 2) y el payload los referencia como `outbox-file:<clave>`. La subida se memoriza por paso (`file:<clave-del-paso>:<archivo>` en el idmap) para que un reintento arme el MISMO body y no choque con la clave idempotente. Más de 3 archivos nuevos en un paso o > 10 MB → solo online (mensaje de la Fase 2). |
| D-F3-7 | **Ids temporales**. | Crear actividad/unidad offline usa `tmp:<uuid>` como `target` y en los payloads dependientes; el handler de creación registra `tmp → id real` y cada paso lo resuelve al enviar. Un `tmp:` que llegara al cliente HTTP hace fallar la request antes de salir. |
| D-F3-8 | **Altas offline fuera de los listados**. | Una actividad/unidad `tmp:` no se inyecta en los caches del backend: aparece en una franja "creadas sin conexión" con su estado hasta sincronizar. Diferido: abrir/editar una actividad `tmp:` y fusionar esa edición en el payload de creación, y el calendario con el badge (tarea 2.2). |
| D-F3-9 | **Borradores en IndexedDB diferidos** (tarea 2.3). | El borrador del formulario sigue en `sessionStorage`; lo que se encola sí guarda los blobs. |
| D-F3-10 | **Una saga por guardado, FIFO por entidad.** | La segunda saga sobre la misma actividad/unidad depende del último paso abierto de la anterior. |

## Flujo

1. `handleSubmit` → `build*Saga(values)` → `runSaga`.
2. Online: paso a paso con `background: false`; red caída → `enqueueSaga({ firstStep })`.
3. Offline: `enqueueSaga` completo; el procesador de la Fase 2 envía cada paso cuando sus `dependsOn` están `done`.
4. Al terminar el lote se invalidan los listados y detalles del planeador.

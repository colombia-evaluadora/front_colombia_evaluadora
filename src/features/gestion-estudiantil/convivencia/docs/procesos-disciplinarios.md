# Procesos disciplinarios (Convivencia escolar, sección 3.5)

Documentación del front de Procesos disciplinarios. Referencia funcional y contrato de DTOs: `c:\Users\crist\Documents\solinces\SSO\docs\gestion-estudiantil\Proceso disciplinario - DTOs.md`.

Rama: `feature/CU-86e3yf6pt-FRONT-G-estudiantil-Convivencia-escolar-proceso-disciplinario`.

## Estado de implementación

| Fase | Alcance | Estado |
|---|---|---|
| 1 | Listado en la pestaña "Procesos disciplinarios", filtros, búsqueda, menú de fila, anulación | Implementada |
| 2 | Abrir proceso (formulario) y detalle del proceso | Implementada |
| 3 | Modales de etapa (descargos, decisión, notificación presencial, registrar recurso, resolver recurso, ajustar fechas, cumplimiento) | Implementada |

Probado en navegador: ciclo completo descargos → decisión Sancionar → notificación presencial → reposición Modifica → apelación Confirma → En firme → ajustar fechas → cumplimiento → Cerrado; y descargos → Archivar.

Fuera de alcance del front: PDFs del backend (no existen) y confirmación del acudiente en el portal (no existe).

## Rutas

- Pestaña: `/app/gestion-estudiantil/convivencia?tab=procesos`. Se añadió `"procesos"` al `tab` de `convivenciaSearchSchema` (`api/schema.ts`) y la pestaña dejó de estar deshabilitada.
- `/app/gestion-estudiantil/convivencia/procesos/nuevo`: Abrir proceso. Acepta `?matricula=&anotacion=` (desde una anotación negativa), `?caso=` (desde un caso) o vacío. `nombre` precarga el nombre del estudiante.
- `/app/gestion-estudiantil/convivencia/procesos/:procesoId`: detalle del proceso.

Las rutas están en `paths.app.convivenciaProcesoNuevo` y `paths.app.convivenciaProceso` (`src/config/paths.ts`) y en `src/router.tsx`, con breadcrumb de Gestión estudiantil > Convivencia.

## Endpoints

Base: `/gestion-estudiantil/convivencia/procesos`, vía `evalCol`.

### Listado

| Método | Ruta | Uso | Fichero |
|---|---|---|---|
| POST | `/query` | Listado paginado con `FILTERS`, `PAGEINDEX`, `PAGESIZE`. El total viene en `total_count` de la primera fila | `api/query/use-procesos-query.ts` |
| GET | `/opciones/responsables-filtro` | Combo de responsables de los procesos visibles | `api/query/use-procesos-query.ts` |
| POST | `/:ID/anular` | Anulación con `{ MOTIVO }` (texto recortado) | `api/mutations/procesos.ts` |
| GET | `/select/ESTADO_PROCESO_DISCIPLINARIO` | Combo de estados (catálogo) | `hooks/use-procesos-filtros.ts` vía `useCatalogo` |
| GET | `/select/INSTANCIA_DISCIPLINARIA` | Combo de instancias (catálogo) | `hooks/use-procesos-filtros.ts` vía `useCatalogo` |

La mutación de anulación invalida `convivenciaKeys.all`, que incluye `procesosKeys` (`api/query-keys.ts`).

### Abrir proceso (§2)

| Método | Ruta | Uso | Fichero |
|---|---|---|---|
| GET | `/opciones/estudiantes?SEARCH=&LIMITE=` | Búsqueda de estudiante por nombre o documento | `api/query/use-proceso-apertura-query.ts` |
| GET | `/opciones/estudiantes-caso` | Presuntos agresores del caso sin proceso activo | `api/query/use-proceso-apertura-query.ts` |
| GET | `/opciones/origenes?MATRICULA=` | Anotaciones negativas no anuladas y casos del estudiante | `api/query/use-proceso-apertura-query.ts` |
| GET | `/opciones/responsables?MATRICULA=` | Responsables del proceso | `api/query/use-proceso-apertura-query.ts` |
| GET | `/opciones/codigos?MATRICULA=` | Códigos de cargo | `api/query/use-proceso-apertura-query.ts` |
| GET | `/opciones/clasificaciones?MATRICULA=` | Clasificaciones de la falta | `api/query/use-proceso-apertura-query.ts` |
| GET | `/plazo-descargos?MATRICULA=&FECHA=` | Plazo para descargos, recalculado por el servidor | `api/query/use-proceso-apertura-query.ts` |
| POST | `/` | Guardar el proceso (§2.2). Sube antes el archivo de cada prueba | `api/mutations/procesos.ts` (`useAbrirProceso`) |

### Detalle (§3)

| Método | Ruta | Uso | Fichero |
|---|---|---|---|
| GET | `/:ID` | Detalle completo; la fila trae `{ proceso }` | `api/query/use-proceso-detalle-query.ts` |

### Etapas (§4 y §5)

| Método | Ruta | Uso | Fichero |
|---|---|---|---|
| GET | `/opciones/sanciones?MATRICULA=&INSTANCIA=` | Sanciones activas de la instancia que decide o resuelve | `api/query/use-proceso-etapas-query.ts` |
| GET | `/:ID/limites-sancion?FECHA=` | Límites de fecha de las sanciones (§4.2) | `api/query/use-proceso-etapas-query.ts` |
| GET | `/:ID/plazo-recurrir?FECHA=` | Hasta cuándo se puede recurrir (§4.3) | `api/query/use-proceso-etapas-query.ts` |
| GET | `/:ID/opciones/recurso` | Opciones del formulario de recurso (§4.4) | `api/query/use-proceso-etapas-query.ts` |
| POST | `/:ID/descargos` | Registrar descargos, Sí o No (§4.1) | `api/mutations/procesos-etapas.ts` |
| POST | `/:ID/decision` | Registrar decisión (§4.2) | `api/mutations/procesos-etapas.ts` |
| POST | `/:ID/notificacion` | Notificación presencial (§4.3) | `api/mutations/procesos-etapas.ts` |
| POST | `/:ID/recursos` | Registrar recurso (§4.4) | `api/mutations/procesos-etapas.ts` |
| POST | `/recursos/:ID/resolucion` | Resolver recurso (§4.5) | `api/mutations/procesos-etapas.ts` |
| PATCH | `/sanciones/:ID/cumplimiento` | Registrar cumplimiento (§5.1) | `api/mutations/procesos-etapas.ts` |
| PATCH | `/sanciones/:ID/fechas` | Ajustar fechas de una sanción (§5.2) | `api/mutations/procesos-etapas.ts` |

Las mutaciones de etapa invalidan todo `convivenciaKeys.all`, porque el listado y el detalle cuelgan de ahí. La respuesta puede venir envuelta en `{ resultado }` o suelta en la fila (`resultadoDe`).

## Permisos en el front

- Los permisos de cada fila vienen del backend en los `puede_*` (`ProcesoAcciones`): `puede_ver_detalle`, `puede_descargos`, `puede_no_presentar`, `puede_decidir`, `puede_notificar`, `puede_recurso`, `puede_resolver`, `puede_ajustar`, `puede_cumplimiento`, `puede_anular`. El front no repite reglas de estado ni de rol.
- El menú de fila (`components/procesos/menu-acciones-proceso.tsx`) muestra todas las acciones; las que el backend niega aparecen deshabilitadas.
- El botón "+ Abrir proceso" (`cabecera-convivencia.tsx`) solo se muestra si `access.puedeSupervisar`, es decir, coordinador o rector.
- Ver detalle navega a `/procesos/:id`. Anular abre el diálogo de anulación con motivo obligatorio.
- El detalle tiene un único menú ⋮ con las acciones de etapa y los documentos (`ItemsDocumentos`). Las entradas de documentos van deshabilitadas porque los PDF aún no existen.

## Listado

- Sede y Jornada arrancan ocultas por defecto; siguen disponibles en «Columnas» (`pages/convivencia-page.tsx`).
- Las seis columnas principales tienen `enableHiding: false`, para que quepan a 1440 px (`columns-procesos.tsx`).
- Los menús ⋮ no llevan `className` en `DropdownMenuContent`: el ancho fijo truncaba el texto de las opciones.

## Estado y vencimientos

- `COLOR_ESTADO_PROCESO` (`api/procesos-ui.ts`) asigna el color del badge a cada estado del catálogo: `EN_DESCARGOS`, `POR_DECIDIR`, `DECIDIDO`, `EN_RECURSO`, `EN_FIRME`, `ARCHIVADO`, `CERRADO`, `ANULADO`.
- `textoVencimiento` arma el texto del próximo vencimiento (`PLAZO_DESCARGOS`, `PLAZO_RECURSOS`, `FIN_SANCION`). La celda `CeldaVencimiento` lo muestra junto a la fecha.
- Las filas `ANULADO` se muestran atenuadas (`isRowMuted`).

## Ficheros

Ruta base: `src/features/gestion-estudiantil/convivencia/`.

### Nuevos: listado (fase 1)

- `api/procesos-types.ts`: tipos del listado (`ProcesoRow`, `ProcesoAcciones`, `ProcesosFiltros`) y `resumenDeProceso`.
- `api/procesos-ui.ts`: colores de estado y texto de vencimiento.
- `api/query/use-procesos-query.ts`: listado (`useProcesosQuery`), traducción de filtros (`toProcesosFilters`) y responsables (`useResponsablesFiltroQuery`).
- `api/mutations/procesos.ts`: `useAnularProceso` y `useAbrirProceso`.
- `hooks/use-procesos-filtros.ts`: estado de filtros y combos de estado e instancia.
- `hooks/use-search-procesos.ts`: estado del buscador y del panel de filtros.
- `components/procesos/columns-procesos.tsx`: columnas de la tabla y dispatch de acciones de fila.
- `components/procesos/celda-vencimiento.tsx`: celda de próximo vencimiento.
- `components/procesos/menu-acciones-proceso.tsx`: menú ⋮ de la fila, con `AccionProceso` y deshabilitado por `puede_*`.
- `components/procesos/search-procesos.tsx`: barra de búsqueda y filtros.
- `components/procesos/dialog-anular-proceso.tsx`: diálogo de anulación con motivo.

### Nuevos: abrir proceso y detalle (fase 2)

- `pages/proceso-form-page.tsx`: apertura del formulario según la URL (vacío, `?matricula=&anotacion=&nombre=` o `?caso=`).
- `pages/proceso-detalle-page.tsx`: detalle del proceso con encabezado, datos, etapas y el único menú ⋮.
- `hooks/use-proceso-form.ts`: estado, validación y envío del formulario de Abrir proceso.
- `utils/proceso-form.ts`: tipos y validaciones del formulario (cargos, pruebas, datos del proceso).
- `utils/proceso-detalle.ts`: formateo del detalle (nombres abreviados, fechas, notificación, citación, acción principal).
- `api/procesos-detalle-types.ts`: DTOs del detalle (catálogos, pruebas, etapas de descargos y decisión).
- `api/query/use-proceso-detalle-query.ts`: `GET /procesos/:ID` (`useProcesoDetalleQuery`).
- `api/query/use-proceso-apertura-query.ts`: opciones del formulario (estudiantes, origen, responsables, códigos, clasificaciones, plazo).
- `components/procesos/form/constructor-cargos.tsx`: constructor repetible de cargos; el primero nace con el código de la anotación.
- `components/procesos/form/constructor-pruebas.tsx`: constructor repetible y opcional de pruebas.
- `components/procesos/form/fila-cargo.tsx`: una fila de cargo (código, clasificación, norma y descripción).
- `components/procesos/form/fila-prueba.tsx`: una fila de prueba (descripción y archivo opcional).
- `components/procesos/form/seccion-datos-apertura.tsx`: fecha de apertura, responsable y plazo para descargos, de solo lectura.
- `components/procesos/form/seccion-estudiante-origen.tsx`: estudiante, anotaciones de origen (selección múltiple) y caso de origen.
- `components/procesos/detalle/bloque-anulacion.tsx`: bloque de anulación (fecha, quién y motivo).
- `components/procesos/detalle/chip-archivo.tsx`: archivo como chip con ver y descargar por `pk_tarchivo`.
- `components/procesos/detalle/datos-proceso.tsx`: datos generales, con vínculos a las anotaciones y al caso de origen.
- `components/procesos/detalle/etapa-apertura.tsx`: etapa de apertura (cargos, pruebas, comunicación, plazo y citación).
- `components/procesos/detalle/etapa-decision.tsx`: etapa de decisión (instancia, resultado, cargos probados, sanciones y acto).
- `components/procesos/detalle/etapa-descargos.tsx`: etapa de descargos (presentados o constancia de que no).
- `components/procesos/detalle/etapa-firmeza.tsx`: etapa de firmeza y sanciones vigentes con su cumplimiento.
- `components/procesos/detalle/etapa-proceso.tsx`: contenedor plegable de cada etapa (abierta, o gris con «pendiente»).
- `components/procesos/detalle/etapa-recursos.tsx`: recursos con su escrito y, si se resolvieron, su resolución.
- `components/procesos/detalle/items-documentos.tsx`: entradas de documentos del menú ⋮, deshabilitadas hasta que existan los PDF.
- `components/procesos/detalle/lista-pruebas.tsx`: pruebas con su descripción y archivo, o «Ninguna».
- `components/procesos/detalle/tabla-sanciones.tsx`: tabla de sanciones con el DataTable del proyecto.

### Nuevos: etapas y cumplimiento (fase 3)

- `api/procesos-etapas-types.ts`: tipos de opciones, límites, recursos y cuerpos de sanción de los modales.
- `api/query/use-proceso-etapas-query.ts`: opciones de etapa (sanciones, límites, plazo para recurrir, opciones de recurso).
- `api/mutations/procesos-etapas.ts`: mutaciones de descargos, decisión, notificación, recurso, resolución, cumplimiento y fechas.
- `utils/proceso-etapas.ts`: validaciones y armado de cuerpos de los modales, con el constructor de sanciones.
- `hooks/use-resultado-etapa.ts`: cierre del modal y mensaje de éxito a partir de la respuesta del backend.
- `hooks/use-dialogos-proceso.tsx`: abre el modal de una etapa desde el listado o el detalle (`abrir(accion, procesoId)`).
- `components/procesos/dialogos/dialogos-proceso.tsx`: elige qué modal pintar según la acción activa.
- `components/procesos/dialogos/dialog-proceso-shell.tsx`: estructura común de los modales (título, resumen, error, pie).
- `components/procesos/dialogos/dialog-registrar-descargos.tsx`: modal de descargos, Sí (versión, pruebas, acta) o No (constancia).
- `components/procesos/dialogos/dialog-registrar-decision.tsx`: modal de decisión (instancia, resultado, cargos, motivación, sanciones y acto).
- `components/procesos/dialogos/dialog-notificacion-presencial.tsx`: modal de notificación presencial con fecha y soporte firmado.
- `components/procesos/dialogos/dialog-registrar-recurso.tsx`: modal de recurso (reposición o apelación).
- `components/procesos/dialogos/dialog-resolver-recurso.tsx`: modal de resolución del recurso (resultado, motivación, sanciones y acto).
- `components/procesos/dialogos/dialog-ajustar-fechas.tsx`: modal de ajuste de fechas de una sanción, acotado por el período.
- `components/procesos/dialogos/dialog-registrar-cumplimiento.tsx`: modal de cumplimiento (Cumplida o No cumplida, con observación).
- `components/procesos/dialogos/constructor-sanciones.tsx`: constructor repetible de sanciones de la decisión y de la resolución.
- `components/procesos/dialogos/fila-sancion.tsx`: una sanción (catálogo, fechas si tiene duración y detalle).
- `components/procesos/dialogos/constructor-pruebas-descargos.tsx`: pruebas que el estudiante aportó en los descargos (opcional).
- `components/procesos/dialogos/campo-archivo.tsx`: campo de archivo (PDF, JPG o PNG, 10 MB) con su error.
- `components/procesos/dialogos/campo-fecha.tsx`: campo de fecha con DatePicker, con mínimo y máximo.
- `components/procesos/dialogos/campo-opcion-unica.tsx`: opción única en radios (p. ej. Sancionar o Archivar).

### Modificados

- `api/query-keys.ts`: `procesosKeys` (`all`, `lista`, `responsables`) bajo `convivenciaKeys.all`.
- `api/schema.ts`: `tab` admite `"procesos"`.
- `api/ui-mappings.ts`: exporta el tipo `BadgeColor`.
- `components/cabecera-convivencia.tsx`: pestaña de Procesos habilitada y botón "+ Abrir proceso" según rol.
- `pages/convivencia-page.tsx`: `PestanaProcesos` con tabla, filtros, paginación, diálogo de anulación y modales de etapa (`useDialogosProceso`).
- `src/config/paths.ts`: `convivenciaProcesoNuevo` y `convivenciaProceso`.
- `src/router.tsx`: rutas `convivenciaProcesoNuevoRoute` y `convivenciaProcesoRoute` con las páginas reales.

## Pendiente

- Descargos «No» sin probar en navegador (requiere plazo vencido).
- PDFs del backend (comunicación de cargos, acta de descargos, resolución). Las entradas de documentos siguen deshabilitadas.
- Confirmación del acudiente en el portal (no existe en el backend).
- Mensaje de X-Mensaje del backend genérico (etiquetas V590) que pisa el mensaje del contrato.
- Opciones de sanciones vacías sin mensaje.
- Candidatos fuera de esta rama con `Field outlined` envolviendo controles que no lo son (`siuce/*`, `si-no.tsx`, `datos-siuce-fields.tsx`).
- Menús de casos y comité con `w-72 nowrap`.

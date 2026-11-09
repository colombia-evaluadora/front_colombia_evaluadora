# Citaciones y compromisos (Gestión estudiantil, secciones 4.1 y 4.2)

Documentación del front de Citaciones y compromisos. Referencia funcional y contrato de DTOs: `c:\Users\crist\Documents\solinces\SSO\docs\gestion-estudiantil\` (especificación, §12.4 para las transiciones de estado). Contrato de endpoints: `postgres/migrations/V609`, `V611` (solo referencia), `V612`, `V613`, `V614` y `V615` del repo SSO.

Rama: `feature/CU-86e3yf6pu-FRONT-G-estudiantil-Citaciones-y-compromisos`.

## Estado de implementación

| Fase | Alcance | Estado |
|---|---|---|
| 1 | Página con pestañas Citaciones y Compromisos, listados, filtros, búsqueda, menús ⋮ con acciones habilitadas por estado | Implementada |
| 2 | Formularios: Nueva citación, Nuevo compromiso, registrar aceptación presencial, registrar resultado | Implementada (aceptación y resultado, sin probar desde el detalle del compromiso) |
| 3 | Diálogos de etapa (programar, reprogramar, cancelar, registrar asistencia) y documentos imprimibles (citación, acta de compromiso) | Implementada |

Probado en navegador con mocks en Vite (puerto 5174):
- Crear citación.
- Crear compromiso, con y sin aceptación presencial.
- Programar, reprogramar y cancelar citación.
- Registrar asistencia (Asistió / No asistió) y aceptación presencial.
- Registrar resultado (Cumplido / Incumplido).
- Vistas imprimibles de citación y acta, con `window.print()`.
- Menú ⋮ habilitado según el estado de cada fila (§12.4).

Sin probar:
- Botones de aceptación y de resultado en el detalle del compromiso.
- Nueva citación con `FK_ATIENDE` elegido (quién atiende).
- Entradas «Citar al acudiente» y «Crear compromiso» desde Observador (anotación) y Convivencia (caso): los menús no se han ejercitado en navegador porque no hay mocks de esos módulos.
- Escudo del encabezado: no se ha ejercitado porque el mock devuelve `escudo_archivo: null`.
- Cualquier llamada contra el backend real (todo lo anterior corre contra mocks).

Pendiente:
- El backend no expone flags `puede_*`. Las acciones se habilitan por estado en el front (§12.4 en `api/ui-mappings.ts`); el backend vuelve a validar cada acción con su gate y devuelve 42501 si no corresponde.
- Colección Postman del módulo.
- Fuera de alcance: portal del acudiente (W.10 y W.11) y plantillas de correo por tipo de aviso.
- Sin vista de detalle de citación: la especificación no la define.

## Rutas

- Listado: `/app/gestion-estudiantil/citaciones-compromisos` (`paths.app.citacionesCompromisos` en `src/config/paths.ts`; ruta `citacionesCompromisosRoute` en `src/router.tsx`).
- Parámetro `?tab=`: `citaciones` (por defecto) o `compromisos`. Se valida con `citacionesSearchSchema` (`api/schema.ts`); cualquier otro valor se ignora y se muestra Citaciones.
- Nueva citación: `/app/gestion-estudiantil/citaciones-compromisos/nueva` (`paths.app.citacionNueva`; `citacionNuevaRoute`). Al guardar vuelve al listado.
- Nuevo compromiso: `/app/gestion-estudiantil/citaciones-compromisos/nuevo-compromiso` (`paths.app.compromisoNuevo`; `compromisoNuevoRoute`). Con `?citacion=<id>` parte de una citación Asistió y toma su estudiante (solo lectura); sin parámetro, el estudiante se busca.

Search params de Nueva citación (`/nueva`) y Nuevo compromiso (`/nuevo-compromiso`), validados con `origenSearchSchema` (`api/schema.ts`). Solo los llevan los accesos desde Observador y Convivencia; un valor inválido se ignora:
- `origen_tipo`: `ANOTACION` o `CASO_CONVIVENCIA`. Con `origen_id` forma el «Registro de origen» (solo lectura); `origen_tipo` y `origen_id` van juntos o no se usan.
- `origen_id`: id de la anotación o del caso.
- `matricula`: matrícula elegida. Fija el estudiante y dispara la consulta del acudiente.
- `estudiante`: nombre del estudiante para mostrarlo en el campo (solo lectura cuando viene con matrícula).
- `citacion` (solo en `/nuevo-compromiso`): id de la citación Asistió de la que parte el compromiso.
- Detalle de compromiso: `/app/gestion-estudiantil/citaciones-compromisos/compromiso/$compromisoId` (`paths.app.compromisoDetalle`; `compromisoDetalleRoute`).

## Endpoints

Base: `/gestion-estudiantil/citaciones` y `/gestion-estudiantil/compromisos`, vía `evalCol`. Contrato completo en el scratchpad de la sesión (`citaciones-dtos.md`).

| # | Método | Ruta | Uso |
|---|---|---|---|
| 1 | POST | `/gestion-estudiantil/citaciones/query` | Listado de citaciones |
| 2 | GET | `/gestion-estudiantil/citaciones/:ID` | Detalle de una citación con su historial |
| 3 | POST | `/gestion-estudiantil/citaciones` | Crear citación |
| 4 | POST | `/gestion-estudiantil/citaciones/:ID/programar` | Programar citación |
| 5 | POST | `/gestion-estudiantil/citaciones/:ID/reprogramar` | Reprogramar citación |
| 6 | POST | `/gestion-estudiantil/citaciones/:ID/cancelar` | Cancelar citación |
| 7 | POST | `/gestion-estudiantil/citaciones/:ID/asistencia` | Registrar asistencia |
| 8 | GET | `/gestion-estudiantil/citaciones/:ID/documento` | Datos de la citación impresa |
| 9 | POST | `/gestion-estudiantil/compromisos/query` | Listado de compromisos |
| 10 | GET | `/gestion-estudiantil/compromisos/:ID` | Detalle de un compromiso con sus ítems |
| 11 | POST | `/gestion-estudiantil/compromisos` | Crear compromiso |
| 12 | POST | `/gestion-estudiantil/compromisos/:ID/aceptacion-presencial` | Registrar aceptación presencial |
| 13 | POST | `/gestion-estudiantil/compromisos/:ID/resultado` | Registrar resultado |
| 14 | GET | `/gestion-estudiantil/compromisos/:ID/documento` | Datos del acta de compromiso |
| 15 | POST | `/gestion-estudiantil/compromisos/soporte` | Soporte firmado (multipart, vía file-service) |
| 16 | GET | `/gestion-estudiantil/citaciones/acudiente/:MATRICULA` | Acudiente de la matrícula (`acudiente_nombre`, null si no hay); alimenta el campo Acudiente de solo lectura |

Búsqueda de estudiantes y de quién atiende: reutilizan endpoints de Convivencia (`/convivencia/funcionarios` y el de opciones de estudiantes de «Abrir proceso»), no los de este módulo.

## Ficheros

Ruta base: `src/features/gestion-estudiantil/citaciones/`.

### Utilidades

- `utils/formularios.ts`: reglas de validación de Nueva citación y Nuevo compromiso (repiten las de V612/V614 para marcar el campo antes de enviar), motivos solo de sistema (`MOTIVOS_SOLO_SISTEMA`, excluidos del alta manual) y tipos de ítem del constructor de compromisos.

### API

- `api/query-keys.ts`: `citacionesKeys`; citaciones y compromisos comparten raíz (`all`), así una sola invalidación refresca ambos listados.
- `api/schema.ts`: `citacionesSearchSchema` (paginación y `tab`) y `origenSearchSchema` (search params de origen y matrícula de los formularios, con `origenDeSearch`).
- `api/types.ts`: tipos de las filas (`CitacionRow`, `CompromisoRow`, `CompromisoDetalle`), documentos (`CitacionDocumento`, `CompromisoDocumento`), `AcudienteMatricula`, `OrigenManual`, códigos de estado y de origen, y cuerpos de escritura en MAYÚSCULAS.
- `api/ui-mappings.ts`: colores de los badges de estado, enlace de «Registro de origen» y `accionesCompromiso` (acciones por estado, §12.4).
- `api/query/use-citaciones-query.ts`: listado (`useCitacionesQuery`), detalle (`useCitacionQuery`), documento (`useCitacionDocumentoQuery`), acudiente de la matrícula (`useAcudienteQuery`, endpoint 16; solo se consulta con matrícula) y traducción de filtros (`toCitacionesFilters`).
- `api/query/use-compromisos-query.ts`: listado (`useCompromisosQuery`), detalle (`useCompromisoQuery`), documento y traducción de filtros (`toCompromisosFilters`).
- `api/query/use-atienden-query.ts`: candidatos a «Quién atiende» (`useAtiendenQuery`), con búsqueda en servidor; reutiliza `GET /convivencia/funcionarios` y queda deshabilitado sin matrícula.
- `api/mutations/use-citaciones-mutation.ts`: envoltorio común de escrituras; invalida `citacionesKeys.all`.
- `api/mutations/crear-citacion.ts`: `useCrearCitacion` (endpoint 3).
- `api/mutations/programar-citacion.ts`: `useProgramarCitacion` (endpoint 4).
- `api/mutations/reprogramar-citacion.ts`: `useReprogramarCitacion` (endpoint 5).
- `api/mutations/cancelar-citacion.ts`: `useCancelarCitacion` (endpoint 6).
- `api/mutations/registrar-asistencia.ts`: `useRegistrarAsistencia` (endpoint 7).
- `api/mutations/crear-compromiso.ts`: `useCrearCompromiso` (endpoint 11).
- `api/mutations/soporte-compromiso.ts`: `subirSoporteCompromiso` (endpoint 15: subida por file-service y registro del `pk_tarchivo`).
- `api/mutations/aceptacion-presencial.ts`: `useRegistrarAceptacionPresencial` (endpoint 12).
- `api/mutations/resultado-compromiso.ts`: `useRegistrarResultado` (endpoint 13).

### Componentes

- `components/columns-citaciones.tsx`: columnas del listado de citaciones (`buildColumnsCitaciones`); Sede y Jornada arrancan ocultas.
- `components/columns-compromisos.tsx`: columnas del listado de compromisos (`buildColumnsCompromisos`); Sede y Jornada arrancan ocultas.
- `components/menu-acciones-citacion.tsx`: menú ⋮ de la citación; las acciones que el estado no permite van deshabilitadas.
- `components/menu-acciones-compromiso.tsx`: menú ⋮ del compromiso (ver detalle, aceptación presencial, resultado). La descarga del acta solo está en la página de detalle, no en este menú.
- `components/campo-origen.tsx`: campo «Registro de origen» de solo lectura (`CampoOrigen`), con el texto de `origenEnlace` para la anotación o el caso que dio pie al alta.
- `components/campo-acudiente.tsx`: campo «Acudiente» de solo lectura (`CampoAcudiente`), el de la matrícula elegida; muestra «Sin acudiente registrado» si la matrícula no tiene.
- `components/search-citaciones.tsx`: buscador y panel de filtros de citaciones.
- `components/search-compromisos.tsx`: buscador y panel de filtros de compromisos.
- `components/campo-estudiante.tsx`: campo Estudiante (`CampoEstudiante`), búsqueda por nombre o documento con espera de 300 ms; en solo lectura cuando llega fijo desde una citación.
- `components/fila-compromiso.tsx`: una fila del constructor de compromisos (`FilaCompromiso`): descripción, responsable y plazo entre la fecha y la revisión.

### Diálogos

- `components/dialogos/use-dialogos-citaciones.tsx`: hooks que abren los diálogos de citación (`useDialogosCitacion`) y de compromiso (`useDialogosCompromiso`).
- `components/dialogos/dialogo-operacion-shell.tsx`: envoltorio común de los diálogos de operación (título, error y botones).
- `components/dialogos/dialog-programar-citacion.tsx`: programar citación (fecha futura, lugar y texto para el acudiente).
- `components/dialogos/dialog-reprogramar-citacion.tsx`: reprogramar citación (nueva fecha y lugar).
- `components/dialogos/dialog-cancelar-citacion.tsx`: cancelar citación con motivo.
- `components/dialogos/dialog-asistencia-citacion.tsx`: registrar asistencia (Asistió / No asistió) con resumen.
- `components/dialogos/dialog-aceptacion-presencial.tsx`: registrar aceptación presencial del compromiso, con soporte firmado opcional.
- `components/dialogos/dialog-resultado-compromiso.tsx`: registrar resultado (Cumplido / Incumplido) con observación.
- `components/dialogos/documento-imprimible.tsx`: hoja imprimible común (`DialogoDocumento`, `HojaDocumento`, `DatosDocumento`, `SeccionDocumento`, `Firma`); imprime solo la hoja con `window.print()`.
- `components/dialogos/dialog-documento-citacion.tsx`: citación al acudiente imprimible (`GET /citaciones/:ID/documento`). Menú ⋮ de la citación: «Descargar citación».
- `components/dialogos/dialog-documento-compromiso.tsx`: acta de compromiso imprimible (`GET /compromisos/:ID/documento`). Solo desde la página de detalle del compromiso.
- `components/dialogos/resumen-citacion.tsx`: cabecera de resumen de la citación (`ResumenCitacion`, `ResumenProgramar`).
- `components/dialogos/resumen-compromiso.tsx`: cabecera de resumen del compromiso (`ResumenCompromiso`).

### Hooks

- `hooks/use-citaciones-access.ts`: permisos del menú CITACIONES_COMPROMISOS (`useCitacionesAccess`); no lee banderas `puede_*` del backend.
- `hooks/use-citaciones-filtros.ts`: estado de filtros de citaciones y compromisos, con la cascada Sede → Jornada y las opciones de quién atiende.
- `hooks/use-search-filtros.ts`: borrador, aplicar y limpiar del panel de filtros, común a los dos listados.
- `hooks/use-citacion-form.ts`: estado, validación y envío de Nueva citación (`useCitacionForm`); vuelve al listado al guardar.
- `hooks/use-compromiso-form.ts`: estado, validación y envío de Nuevo compromiso (`useCompromisoForm`), incluidos el constructor de ítems y la subida del soporte.
- `hooks/use-estado-dialogo.ts`: error y estado de envío compartidos por los diálogos de operación (`useEstadoDialogo`).

### Encabezado de los documentos

Las dos hojas imprimibles (citación y acta) llevan el encabezado del establecimiento, que llega en las columnas `datos` de los endpoints 8 y 14:
- `establecimiento`, `establecimiento_dane`, `establecimiento_nit`, `municipio`, `departamento`.
- `escudo_archivo`: `pk_tarchivo` del escudo; null = sin escudo.
- Citación: `cita` y `cita_cargo` (cargo de quien cita, ej. «Coordinador»).
- Acta: `crea` y `creador_cargo` (cargo de quien registra el compromiso).
- Compromiso: `acudiente_nombre` (en la fila de `POST /compromisos/query` y en el detalle). El acta lleva `acudiente`.

El Motivo no aparece en el documento de la citación: la especificación lo excluye.

### Páginas

- `pages/citaciones-compromisos-page.tsx`: página con pestañas (`?tab=`), cabecera con el botón de alta de cada pestaña y los dos listados.
- `pages/citacion-form-page.tsx`: Nueva citación (`CitacionFormPage`); estudiante, motivo, texto para el acudiente, fecha, lugar y quién atiende.
- `pages/compromiso-form-page.tsx`: Nuevo compromiso (`CompromisoFormPage`); con `?citacion=` parte de una citación Asistió, incluye la aceptación presencial opcional y el constructor de compromisos.
- `pages/compromiso-detalle-page.tsx`: detalle del compromiso (`CompromisoDetallePage`) con sus ítems, acudiente, soporte firmado, acciones de aceptación y resultado según estado, y «Descargar acta de compromiso».

### Entradas desde Observador y Convivencia

- Observador, menú ⋮ de cada anotación vigente: «Citar al acudiente» y «Crear compromiso». Abren Nueva citación o Nuevo compromiso con `origen_tipo=ANOTACION`, `origen_id`, `matricula` y `estudiante`. Están deshabilitadas si la anotación no está vigente (`columns-anotaciones.tsx`, `observador-page.tsx`).
- Convivencia, menú de cada caso («Citar al acudiente» y «Crear compromiso»; `menu-acciones-caso.tsx`): abren los mismos formularios con `origen_tipo=CASO_CONVIVENCIA` y `origen_id`. Desde la pestaña de casos (`convivencia-page.tsx`) y desde el detalle del caso (`use-caso-detalle.ts`).


### Documentación

- `docs/citaciones-compromisos.md`: este documento.

## Mocks

- `src/mocks/db/citaciones-compromisos.ts`: datos semilla con la forma de las filas reales (snake_case, estados por código): 9 citaciones (ids 101 a 109) y 5 compromisos (ids 40 a 44), con catálogos de estado, motivo, tipo y responsable.
- `src/mocks/handlers/citaciones-compromisos.ts`: handlers MSW de los 16 endpoints; los listados devuelven `{ rows }` con `total_count`, y los errores de PL/pgSQL llegan como 400 (22023), 403 (42501) o 404 (P0002). Registrado en `src/mocks/handlers/index.ts`.
- Navegación de mock: `src/mocks/db/navigation.ts` (entrada de menú de la ruta).

## Pendiente

- Probar contra backend real (todo lo probado corre contra mocks).
- Probar aceptación y resultado desde el detalle del compromiso, y Nueva citación con `FK_ATIENDE` elegido.
- Probar las entradas de Observador y Convivencia en navegador (sin mocks de esos módulos) y el escudo en el encabezado (mock con `escudo_archivo: null`).
- Flags `puede_*` en el backend; hoy las acciones se habilitan por estado en el front.
- Colección Postman del módulo.
- Fuera de alcance: portal del acudiente (W.10 y W.11) y plantillas de correo por tipo de aviso.
- Vista de detalle de citación (no definida en la especificación).

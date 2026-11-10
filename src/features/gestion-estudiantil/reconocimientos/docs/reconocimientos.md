# Logros y reconocimientos (Gestión estudiantil, secciones 7.1 y 7.2)

Documentación del front de Logros y reconocimientos. Referencia funcional: `c:\Users\crist\Documents\solinces\SSO\docs\gestion-estudiantil\` (especificación, §7). Backend y documento de referencia: `Logros y reconocimientos - backend.md` en esa misma carpeta. Contrato de endpoints: migraciones `postgres/migrations/V624` a `V630` del repo SSO (V630 es el contrato de los endpoints de este módulo).

Rama: `feature/CU-86e3yf6q5-FRONT-G-estudiantil-Logros-y-reconocimientos`.

## Estado de implementación

| Fase | Alcance | Estado |
|---|---|---|
| 1 | API (tipos, query-keys, queries, mutaciones), mocks MSW, ruta, menú y ROUTE_OWNERS; página con listado, filtros, sugerencias y menú ⋮ | Implementada |
| 2 | Modal de formulario (nuevo, modificar, otorgar) con soporte y selectores; diálogo de detalle y ruta `$reconocimientoId` | Implementada |
| 3 | Diálogos Anular y Mención de honor (sin QR) | Implementada |

Verificado en navegador con mocks (Vite en el puerto 5174, usuario coordinador@example.com): crear con dos estudiantes, modificar, otorgar una sugerencia (sale de la lista), detalle por ruta, anular (sale del listado; vuelve con «Incluir anulados» con Badge «Anulado»), mención de honor de un reconocimiento no anulado; la mención de uno anulado queda deshabilitada.

Sin probar: contra backend real (query-service no levantado) y el error 22023 del backend dentro del diálogo de anular.

## Rutas

- Listado: `/app/gestion-estudiantil/reconocimientos`.
- Detalle: `/app/gestion-estudiantil/reconocimientos/$reconocimientoId`. Abre la página con el diálogo de detalle; es el enlace del aviso `RECONOCIMIENTO_NUEVO`. Al cerrarlo navega al listado.

## Endpoints

Base: `/gestion-estudiantil/reconocimientos`, cliente `evalCol`.

| # | Método y ruta | Uso | Entrada (clave) | Salida (clave) |
|---|---|---|---|---|
| 1 | GET `/` | Listado de reconocimientos | ESTABLECIMIENTO!, SEDE, JORNADA, TIPO, PERIODO, SEARCH (1–100), ANULADOS, PAGEINDEX, PAGESIZE (20) | Filas con id, fecha, estudiante, grado_grupo, tipo, motivo, otorgado_por, periodo, es_sugerencia_puesto, anulado, puede_modificar, puede_anular, total_count |
| 2 | GET `/:ID` | Detalle | — | Columna `datos`: lo del listado más actividad, soporte, registrado_por y anulación `{fecha, motivo, por}` o null |
| 3 | POST `/` | Crear (uno o varios estudiantes) | MATRICULAS BIGINT[]!, FK_TIPO!, MOTIVO!, FECHA! (aaaa-mm-dd), FK_OTORGADO_POR!, FK_ACTIVIDAD, FK_SOPORTE | ids creados |
| 4 | PUT `/:ID` | Modificar | FK_TIPO!, MOTIVO!, FECHA!, FK_OTORGADO_POR!, FK_ACTIVIDAD, FK_SOPORTE | id |
| 5 | PUT `/:ID/anular` | Anular (con motivo; no se elimina) | MOTIVO! | id |
| 6 | GET `/sugerencias` | Sugerencias de Puesto 1 del período | ESTABLECIMIENTO!, SEDE, JORNADA | Filas con estudiante, grado_grupo, período, fecha_cierre, motivo_sugerido, fk_tlv_tipo_sugerido |
| 7 | POST `/sugerencias/otorgar` | Otorgar una sugerencia | FK_MATRICULA!, MOTIVO!, FECHA!, FK_OTORGADO_POR!, FK_ACTIVIDAD, FK_SOPORTE | id |
| 8 | GET `/:ID/mencion-honor` | Datos de la mención de honor imprimible | — | Columna `datos`: establecimiento, estudiante, estudiante_documento, grado_grupo, tipo_nombre, motivo, fecha y el encabezado del establecimiento |
| 9 | POST `/soporte` | Subida del soporte (file-service, `postMultipart` a `/eval-col/gestion-estudiantil/reconocimientos/soporte`, campo SOPORTE) | Archivo | `{ pk_tarchivo }` |
| 10 | GET `/opciones/estudiantes` | Selector de estudiantes | ESTABLECIMIENTO!, SEDE, JORNADA, GRUPO, SEARCH, PAGESIZE (50) | fk_tmatricula, estudiante_nombre, estudiante_documento, grado_grupo, fk_tgrupo |
| 11 | GET `/opciones/otorgantes` | Selector de quién otorga | ESTABLECIMIENTO!, SEARCH, PAGESIZE (50) | fk_tfuncionario, nombre, es_usuario_actual |

Los parámetros de entrada van en MAYÚSCULAS exactas (ver §ParamBinder de query-service en el repo SSO). El `!` marca obligatorio.

Roles de backend: leer RECTOR, COORDINADOR, DIRECTOR_GRUPO, PSICO_ORIENTADOR, DOCENTE y SUPER_ADMINISTRADOR; crear, modificar, soporte y opciones para RECTOR, COORDINADOR, DIRECTOR_GRUPO y DOCENTE; anular y sugerencias solo RECTOR y COORDINADOR.

## Pantallas

1. **Listado** (`/app/gestion-estudiantil/reconocimientos`):
   - Cabecera «Reconocimientos» y botón «Nuevo reconocimiento». Se deshabilita (no se oculta) para PSICO_ORIENTADOR y SUPER_ADMINISTRADOR.
   - Bloque «Sugerencias por Puesto · [Período]» con ⓘ: filas «Nombre · Puesto 1 en 6°B» y botón «Otorgar». Solo para RECTOR y COORDINADOR; si no hay sugerencias, el bloque no se muestra.
   - Buscador «Buscar por estudiante» con panel de filtros: Contiene las palabras, Sede, Jornada, Tipo, Período de Evaluación; chips y «Limpiar filtros»; botón de columnas visibles.
     - El Período de Evaluación usa el endpoint de períodos de Informes, que pide sede y jornada: el filtro queda deshabilitado hasta elegirlas.
   - Casilla «Incluir anulados» (`ANULADOS=true`). Una fila anulada lleva Badge soft «Anulado».
   - DataTable: Fecha, Estudiante, Grado/Grupo, Tipo, Motivo, Otorgado por y acciones ⋮. Sede y Jornada no vienen en la fila, así que no se añaden. Contador «N reconocimientos».
   - Menú ⋮: Ver detalle; Modificar (deshabilitado si `!puede_modificar`); Anular (deshabilitado si `!puede_anular`); separador; Generar mención de honor (deshabilitado si `anulado`).
2. **Modal Nuevo reconocimiento**: Estudiantes* (multiselección, `opciones/estudiantes`), Tipo de reconocimiento* (Lista de Valores `TIPO_RECONOCIMIENTO`, vía `useCatalogo`; nunca valores quemados), Motivo* (5–200, contador «n / 200»), Fecha* (ayuda «En un período Calificable.»), Otorgado por* (`opciones/otorgantes`, por defecto la fila con `es_usuario_actual`), Actividad relacionada (opcional, `GET /gestion-estudiantil/actividades?SEARCH=`; el `PERIODO` de ese endpoint es período académico, no de evaluación, así que no se envía), Soporte (imagen o PDF, 10 MB, opcional). Texto «Los campos marcados con * son obligatorios». Botones Cancelar y Guardar.
3. **Modal Modificar**: el mismo formulario, con Estudiante fijo de solo lectura. `PUT /:ID`.
4. **Modal Otorgar (sugerencia)**: el mismo formulario, con Estudiante fijo, Tipo fijo «Mejor desempeño académico» (deshabilitado) y Motivo precargado con `motivo_sugerido`. `POST /sugerencias/otorgar`.
5. **Diálogo Ver detalle**: todos los campos, actividad, soporte (descarga con `fetchArchivoViewUrl`), período de evaluación, registrado por y anulación (fecha, motivo, por). Anular y Mención de honor solo están en el menú ⋮ (ver decisiones pendientes).
6. **Diálogo Anular**: Motivo* (1–500). `PUT /:ID/anular`.
7. **Mención de honor**: reutiliza `DialogoDocumento` de citaciones (`commons/components/documento-imprimible.tsx`) y el encabezado del establecimiento. Firmas «Rector(a)» y «Responsable de grupo» como líneas en blanco. Sin QR.

## Piezas comunes (commons)

Las piezas usadas por más de un módulo viven en `src/features/gestion-estudiantil/commons/{components,hooks,api,utils}/`: ComboOpciones, SoportesUpload, TextoLargo, SeccionPlegable, Dato, DialogoOperacionShell, documento-imprimible, BarraBusquedaFiltros, icono-carga, useSearchFiltros, useEstadoDialogo, useOpcionesCascada, useCatalogo, desenvolver/queryString, useOpcionesGrupos (con `claveModulo` obligatoria), Opcion, formatos, badge-color y validaciones.

Regla: sin estado compartido entre módulos. Cada módulo tiene sus propias claves de columnas, query-keys y filtros. La caché de catálogo y de cascada es compartida porque es de solo lectura.

## Ficheros

Ficheros de `src/features/gestion-estudiantil/reconocimientos/`:

- `api/mutations/anular-reconocimiento.ts`: mutación de anular (PUT `/:ID/anular`).
- `api/mutations/crear-reconocimiento.ts`: mutación de crear (POST `/`).
- `api/mutations/modificar-reconocimiento.ts`: mutación de modificar (PUT `/:ID`).
- `api/mutations/otorgar-sugerencia.ts`: mutación de otorgar una sugerencia (POST `/sugerencias/otorgar`).
- `api/mutations/soporte-reconocimiento.ts`: subida del soporte a file-service.
- `api/mutations/use-reconocimientos-mutation.ts`: envoltorio común de las mutaciones y tipos de resultado.
- `api/query-keys.ts`: claves de query propias del módulo.
- `api/query/use-opciones-reconocimiento-query.ts`: consultas de los selectores de estudiantes y otorgantes.
- `api/query/use-reconocimientos-query.ts`: consulta del listado y traducción de filtros a parámetros.
- `api/query/use-sugerencias-query.ts`: consulta de sugerencias de Puesto 1.
- `api/types.ts`: tipos de filas, detalle, anulación y sugerencias.
- `api/ui-mappings.ts`: roles que escriben y supervisan, y acciones permitidas por fila.
- `components/columns-reconocimientos.tsx`: columnas del DataTable.
- `components/dialogos/dialog-anular-reconocimiento.tsx`: diálogo Anular.
- `components/dialogos/dialog-detalle-reconocimiento.tsx`: diálogo Ver detalle.
- `components/dialogos/dialog-mencion-honor.tsx`: diálogo de la mención de honor.
- `components/dialogos/dialog-reconocimiento-form.tsx`: diálogos Nuevo, Modificar y Otorgar sobre el mismo formulario.
- `components/dialogos/use-dialogos-reconocimientos.tsx`: estado de qué diálogo está abierto.
- `components/form/campo-estudiantes.tsx`: selector de estudiantes (multiselección, o campo fijo).
- `components/form/formulario-reconocimiento.tsx`: campos del formulario de reconocimiento.
- `components/menu-acciones-reconocimiento.tsx`: menú ⋮ de cada fila.
- `components/search-reconocimientos.tsx`: buscador y panel de filtros.
- `components/sugerencias-por-puesto.tsx`: bloque de sugerencias con botón Otorgar.
- `docs/reconocimientos.md`: este documento.
- `hooks/use-reconocimiento-form.ts`: estado y validación del formulario según el modo.
- `hooks/use-reconocimientos-access.ts`: permisos de la pantalla según el rol.
- `hooks/use-reconocimientos-filtros.ts`: estado de los filtros del listado.
- `pages/reconocimientos-page.tsx`: página del listado, con sugerencias, filtros y diálogos.
- `utils/formularios.ts`: límites del motivo (5–200) y tipo de valores del formulario.

## Revisión del backend

Cumple:
- Regla 3: anular con motivo, no eliminar (V628 `anular_interno`, V627 `validar_no_anulado`).
- Regla 32: sugerencias de Puesto 1, empates y tipo forzado (V626 `fn_reconocimiento_puesto`, V628 sugerencias/otorgar).
- Regla 38: Responsable de actividad (V626, atajo).
- Regla 5, aviso: V628 encola `RECONOCIMIENTO_NUEVO`.
- Banderas `puede_modificar` y `puede_anular` con la regla del gate (V626 `fn_reconocimiento_puede_modificar`).
- Selectores con alcance propio (V628 opciones).
- Soporte con su regla en file-service.

Falta o no cumple:
- QR, firmas y documento emitido de la mención: pendiente de infraestructura.
- Portal del acudiente (W.8.LIS.1): fuera de alcance.
- Sin parámetro de orden en el listado: las columnas no se ordenan en el cliente.
- El selector de Actividad relacionada usa el listado de actividades; no hay opciones dedicadas (B3).

## Decisiones pendientes

- Suposición vigente: el Director de grupo y el Responsable de actividad solo corrigen lo que registraron, nunca un reconocimiento de Puesto 1. Pendiente de confirmar: la corrección por Director/Responsable queda limitada a lo que registraron.
- Añadir Anular y Mención de honor al pie del detalle (hoy solo en el menú ⋮).
- Sin QR ni firmas en la mención.
- El selector de Actividad relacionada usa el listado de actividades.
- Portal del acudiente: fuera de este módulo.

## Bitácora

- 2026-11-10: plan y rama creados; fase 1 lanzada.
- 2026-11-10: fases 1–3 y carpeta commons; verificación tsc, oxlint y vitest completo (1474 tests) en verde.

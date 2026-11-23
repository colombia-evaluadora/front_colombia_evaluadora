# Acompañamientos (embarazo y consumo) — módulo front

Estado: fases 1, 2 y 3 implementadas; probadas en local el 2026-11-18. Brechas B1–B3 del backend resueltas (ver «Brechas del backend»).

Tarea: CU-86e3yf6qd (§9.9 Embarazo y §9.10 Consumo de sustancias).

Fuentes: especificación publicada (§9.9 y §9.10, manda sobre el prototipo), prototipos G.8.EMB.*, G.8.CON.* y G.1.REP.4, y contrato real del backend (V685–V691).

## Alcance

**En alcance**

- 9.9 Embarazo y maternidad/paternidad: listado, filtros, detalle, crear y modificar acompañamiento, acciones y remisiones, resultado de acción, cerrar, anular, aviso de duplicado (G.8.EMB.4) y exportación SIUCE.
- 9.10 Consumo de sustancias: listado, filtros, detalle, crear y modificar acompañamiento, acciones y remisiones, resultado de acción, cerrar, anular, vista «Reportes recibidos», vincular reporte, ver reporte, exportación SIUCE y reporte del docente desde el Observador (G.1.REP.4).

**Fuera de alcance**

- Ninguno del plan de §9.9 y §9.10. Quedan fuera del front las brechas abiertas de «Brechas del backend».

## Endpoints

Prefijo de servicio: `eval-col` (gateway `/api/eval-col`), base `/gestion-estudiantil/prevencion`.

| Uso | Método y ruta | Roles |
|---|---|---|
| Listado (TIPO=EMBARAZO\|CONSUMO) | GET /gestion-estudiantil/prevencion/acompanamientos ?ESTABLECIMIENTO&TIPO&SEDE&JORNADA&RESPONSABLE&ESTADO&SEARCH&PAGEINDEX&PAGESIZE | rector, coord, orient, tsocial |
| Detalle (JSON `datos`) | GET …/acompanamientos/:ID | idem |
| Crear / modificar embarazo | POST …/embarazo · PUT …/embarazo/:ID | orient |
| Crear / modificar consumo | POST …/consumo · PUT …/consumo/:ID | orient |
| Acción o remisión (crear/editar con BODY.ACCION) | POST …/:ID/acciones | orient |
| Resultado de acción | POST …/acciones/:ID/resultado | los 4 |
| Cerrar (RESUMEN) | POST …/:ID/cerrar | orient |
| Anular (MOTIVO) | POST …/:ID/anular | rector, coord |
| Historial (aviso duplicado «Ver historial») | GET …/estudiantes/:MATRICULA/historial ?TIPO | los 4 |
| Selector Atención de origen | GET …/opciones/atenciones ?MATRICULA | orient |
| Selector Responsable | GET …/opciones/responsables ?MATRICULA&SOLO_ORIENTACION&SEARCH | orient |
| Soporte (multipart, campo SOPORTE) | POST …/soporte | los 4 |
| Reportes recibidos | GET …/consumo/reportes | orient |
| Ver reporte | GET …/consumo/reportes/:ID | orient |
| Vincular reporte (DESTINO + ACOMPANAMIENTO o datos de uno nuevo) | POST …/consumo/reportes/:ID/vincular | orient |
| Acompañamientos abiertos del estudiante | GET …/consumo/opciones/abiertos ?MATRICULA | orient |
| Reportar consumo (docente, G.1.REP.4) | POST …/consumo/reportes | docente, orient |
| Exportar SIUCE | POST …/embarazo/siuce · …/consumo/siuce (BODY.FILTERS.*) | rector, coord |
| Acceso (banderas `puede_crear_acomp`, `puede_exportar_siuce_acomp`, `ver_embarazo`, `ver_consumo`, `ver_reportes_consumo`) | GET …/acceso | según rol |
| Contexto del estudiante al elegirlo | GET …/acompanamientos/opciones/contexto ?MATRICULA | orient |
| Observador firmado: soporte (multipart, campo SOPORTE) | POST /gestion-estudiantil/observador/firmado/soporte | rol del observador |
| Observador firmado: alta (tras el soporte) | POST /gestion-estudiantil/observador/firmado | idem |
| Observador firmado: histórico del estudiante | GET /gestion-estudiantil/observador/firmados ?FK_MATRICULA | idem |
| Selector Estudiante | GET /gestion-estudiantil/prevencion/opciones/estudiantes (ya en `use-opciones-prevencion-query.ts`) | |

No usado: GET …/consumo/reportes/mios existe en el backend, pero el front no lo usa; la tabla «Mis reportes y remisiones» ya trae los reportes de consumo del docente.
| Listas | `useCatalogo`: SITUACION_ACOMP_EMBARAZO, RESPUESTA_ACOMPANAMIENTO, ACCION_ACOMP_EMBARAZO, ACCION_ACOMP_CONSUMO, ORIGEN_INFO_CONSUMO, SUSTANCIA_CONSUMO, LUGAR_CONSUMO, DESTINO_REPORTE_CONSUMO, ENTIDAD_REMISION | |

Duplicado: crear sin `CREAR_DE_TODOS_MODOS` puede responder error de duplicado y el front muestra el aviso G.8.EMB.4 «Ya existe un acompañamiento abierto», con «Ver historial» y «Crear de todos modos» (que reenvía con `true`). El SQLSTATE y el mensaje se confirman leyendo `fn_prevencion_acomp_validar_duplicado` (V688).

Listado: columnas de `fn_prevencion_acomp_listar_interno` (V689): estudiante, documento, sede, jornada, grado_grupo, situación o sustancia, responsable, estado, próxima acción (fecha, tipo, vencida) y banderas `puede_modificar`, `puede_registrar_accion`, `puede_cerrar` y `puede_anular`.

## Ficheros

- `prevencion/api/mutations/acompanamientos.ts`: crear y modificar embarazo y consumo; el alta sin `CREAR_DE_TODOS_MODOS` responde el duplicado.
- `prevencion/api/query/use-acompanamientos-query.ts`: consultas del listado y de Reportes recibidos, con `toAcompanamientosFilters` y `toReportesConsumoFilters`.
- `prevencion/api/query-keys.ts`: claves de React Query, incluida la de `acceso`.
- `prevencion/api/siuce-acomp-columnas.ts`: columnas seleccionables de la exportación SIUCE por tipo (`SIUCE_ACOMP_COLUMNAS`).
- `prevencion/api/types.ts`: banderas de acceso y tipos de `AcompanamientoRow`, estados y reportes de consumo.
- `prevencion/api/ui-mappings.ts`: colores de los estados del acompañamiento (`ESTADO_ACOMP_COLOR`) y opciones del filtro Estado, sin endpoint.
- `prevencion/api/mutations/soporte-prevencion.ts`: `subirSoportePrevencion`, que sube el soporte por file-service y devuelve su pk.
- `prevencion/components/acompanamientos/acompanamientos-tab.tsx`: pestañas por rol, «Nuevo acompañamiento» y «Exportar para el SIUCE» según las banderas del acceso.
- `prevencion/components/acompanamientos/columns-acompanamientos.tsx`: columnas del listado y de Reportes recibidos (`buildColumnsAcompanamientos`).
- `prevencion/components/acompanamientos/search-acompanamientos.tsx`: filtros comunes (Sede, Jornada, Estado) y Responsable solo en acompañamientos.
- `prevencion/components/acompanamientos/acciones-acompanamiento.tsx`: tipo `AccionAcomp` y acciones por fila (ver, modificar, acción, cerrar, anular).
- `prevencion/components/acompanamientos/menu-acciones-acompanamiento.tsx`: menú de acciones de la fila; Vincular se deshabilita en un reporte Atendido.
- `prevencion/components/acompanamientos/badges-acompanamiento.tsx`: badge del estado del acompañamiento.
- `prevencion/components/acompanamientos/bloque-contexto.tsx`: bloque de contexto del estudiante, de solo lectura.
- `prevencion/components/acompanamientos/detalle/detalle-acompanamiento.tsx`: contenido del detalle (contexto, datos del tipo, acciones, reportes vinculados, cierre o anulación).
- `prevencion/components/acompanamientos/form/campos-acompanamiento.tsx`: campos de Nuevo y Modificar por embarazo o consumo (G.8.EMB.3, G.8.CON.3).
- `prevencion/components/acompanamientos/form/campo-respuesta.tsx`: campo de respuesta de selección con su error.
- `prevencion/components/acompanamientos/form/dialogo-duplicado.tsx`: aviso de duplicado (G.8.EMB.4) con «Ver historial» y «Crear de todos modos».
- `prevencion/components/acompanamientos/dialogos/use-dialogos-acompanamiento.tsx`: hook que abre un solo modal de operación a la vez.
- `prevencion/components/acompanamientos/dialogos/dialog-accion-acomp.tsx`: alta y edición de una acción o remisión (sin editar una que ya tiene resultado).
- `prevencion/components/acompanamientos/dialogos/dialog-resultado-accion.tsx`: registrar el resultado de una acción y marcarla Realizada.
- `prevencion/components/acompanamientos/dialogos/dialog-cerrar-acomp.tsx`: cerrar con resumen de 10 a 2000 caracteres; los textos de consumo aclaran que cerrar no certifica que no haya consumo.
- `prevencion/components/acompanamientos/dialogos/dialog-anular-acomp.tsx`: anular un acompañamiento con motivo.
- `prevencion/components/acompanamientos/dialogos/resumen-acomp.tsx`: línea de resumen bajo el título de los modales (situación o sustancia, estado, fecha).
- `prevencion/components/acompanamientos/dialogos/dialog-exportar-siuce-acomp.tsx`: exportación SIUCE con revisión previa, columnas seleccionables y descarga con los filtros del listado.
- `prevencion/components/acompanamientos/dialogos/dialog-reportar-consumo.tsx`: reporte de posible consumo por el docente (G.1.REP.4).
- `prevencion/components/acompanamientos/dialogos/dialog-ver-reporte.tsx`: ver el reporte original; al abrirlo pasa a Recibido.
- `prevencion/components/acompanamientos/dialogos/dialog-vincular-reporte.tsx`: vincular un reporte a un acompañamiento existente o abrir uno nuevo.
- `prevencion/hooks/use-acompanamiento-form.ts`: estado, validación y envío de Nuevo y Modificar.
- `prevencion/hooks/use-acompanamientos-lista.ts`: consulta, tabla y acciones del listado; Sede y Jornada ocultas de entrada.
- `prevencion/hooks/use-acompanamientos-filtros.ts`: filtros del listado de acompañamientos y de reportes.
- `prevencion/hooks/use-navegacion-prevencion.ts`: navegación del módulo de prevención (cambio de esta rama).
- `prevencion/pages/acompanamiento-form-page.tsx`: página de Nuevo (por tipo) y Modificar (por id).
- `prevencion/pages/acompanamiento-detalle-page.tsx`: página de detalle; abrirla deja traza de consulta.
- `prevencion/pages/prevencion-page.tsx`: pestañas Embarazo y maternidad/paternidad y Consumo de sustancias.
- `prevencion/utils/formularios-acompanamiento.ts`: límites de texto y validaciones del formulario (`DESCRIPCION_ACOMP_MIN`, `TEXTO_ACOMP_MAX`, `FUENTE_MAX`).
- `observador/api/firmado.ts`: alta del observador firmado en dos pasos (soporte y luego registro) y listado de firmados por estudiante.
- `observador/components/dialogs/dialog-cargar-observador-firmado.tsx`: diálogo para cargar el observador firmado y abrir los firmados ya cargados.
- `observador/components/table/columns-anotaciones.tsx`: acción «Reportar posible consumo» en el menú de la anotación, con la misma población que salud mental.
- `inclusion/orientacion/components/tab-mis-remisiones.tsx`: tabla «Mis reportes y remisiones» con los reportes de consumo del docente (etiqueta REPORTE_CONSUMO y colores).
- `src/config/paths.ts`: rutas de acompañamientos (nuevo por tipo, detalle y editar).
- `src/router.tsx`: rutas de acompañamientos (nuevo por tipo, detalle y editar).
- `src/features/navigation/lib/route-menu-ownership.test.ts`: menú dueño de las rutas de acompañamientos.
- `src/lib/report-client.ts`: claves `prevencion-embarazo-siuce` y `prevencion-consumo-siuce` del reporting-service.

## Lo probado

Probado en local el 2026-11-18:

- Listados y pestañas por rol.
- Crear embarazo 80117 y consumo 80118, incluido el duplicado con «Crear de todos modos».
- Modificar un acompañamiento.
- Remisión externa y resultado de acción con soporte.
- Cerrar un acompañamiento.
- Reportar consumo como docente.
- Ver reporte (pasa a Recibido) y Vincular → abrir nuevo (queda Atendido).
- Anular como rector.
- Exportar SIUCE de consumo (xlsx).
- Contexto al elegir estudiante.
- Cargar observador firmado y descargarlo, con file-service local (la clase `ReglaObservadorFirmado` copiada, porque la imagen test-latest del 17/11 no la traía).
- `tsc` 0 errores; oxlint limpio; vitest 247 ficheros y 1629 tests.

## Brechas del backend

- **B1, B2 y B3:** resueltas en la rama SSO feature/CU-86e3yf6qd-BACK-Prevencion-y-retencion-acompanamientos-brechas-front (V655, V656, V689.1, V690.1, V691.1).
- **Abiertas:**
  - Las opciones del filtro Estado no tienen endpoint (array en `ui-mappings`).
  - El SIUCE sale en una sola hoja; el prototipo muestra tres.
  - El contador «Reportes recibidos (N)» no tiene endpoint.

## Decisiones pendientes

- Textos de estado vacío no especificados: «Aún no hay acompañamientos.», «No hay acompañamientos para los filtros aplicados.», «No hay reportes recibidos.», «Aún no hay acciones registradas.», «No hay reportes vinculados.».
- «Reportar posible consumo» se habilita con la capacidad de Reportar salud mental.
- `errorLargo` común dice «es obligatorio» en masculino.
- El toast de guardar acción muestra la etiqueta de auditoría en lugar de «Acción registrada.».

## Bitácora

**2026-11-18**

- Plan de front §9.9 y §9.10 aprobado (CU-86e3yf6qd).
- Revisión del backend V685–V691.
- Fase 1: API (tipos, claves, queries, mutaciones) y pestañas «Embarazo y maternidad/paternidad» y «Consumo de sustancias» en `prevencion-page.tsx`.
- Fase 2: listado, filtros, detalle, Nuevo y Modificar, acciones, remisiones, resultado, cerrar, anular, aviso de duplicado y exportación SIUCE.
- Fase 3: Reportes recibidos, Ver reporte, Vincular, y Reportar posible consumo desde el Observador (G.1.REP.4).
- Corrección: observador firmado (carga y descarga).
- Corrección: etiqueta REPORTE_CONSUMO y colores en «Mis reportes y remisiones».
- Brechas B1–B3 del backend conectadas en el front.

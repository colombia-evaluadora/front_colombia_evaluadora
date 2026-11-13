# Prevención y retención — módulo front

Estado: alcance 9.1–9.8, Historial académico (G.8.HIS) y cruces con Observador, Historial del estudiante, Valoraciones y Planes implementados. Probado en navegador salvo lo indicado en «Sin probar».

Tareas: CU-86e3yf6qa (base del módulo) y CU-86e3yf6qd (esta entrega: Estrategias, Caracterización, Historial académico y cruces). Backend: SSO PR #996.

Rama: `feature/CU-86e3yf6qd-FRONT-G-estudiantil-Prevencion-y-retencion-salud-mental-embarazo-y-consumo-de-sustancias`

## Alcance y fuera de alcance

**En alcance**

- 9.1 Tablero de alertas (G.8.TAB.1–7).
- 9.2 Señal `REPORTE_DOCENTE` dentro del tablero.
- 9.3 Valoraciones y planes: listado, detalle de plan y de valoración, avance, aceptación presencial, marcar, anular plan y valoración, modificar plan.
- 9.4 Indicadores (G.8.IND.1–2), incluido IE-01 (`/indicadores/gestion`) y export Excel con clave `prevencion-indicadores`.
- 9.5 Parámetros de riesgo (G.10.RIE.1): pestaña solo para el Rector.
- 9.6 Salud mental: listado, reporte, valoración (con modal crítico), atención y cierre con bloqueo.
- 9.7 Estrategias de permanencia (G.8.EST.1–10): pestaña, listado, nueva y modificar como página, detalle con efectividad y beneficiarios, agregar beneficiarios con «Seleccionar todos» paginado, retirar con Resultado de la salida, copiar y finalizar.
- 9.8 Caracterización familiar y de vivienda (G.8.CAR.1–3): pestaña, listado, página de lectura y edición con todas las secciones y los 5 campos nuevos de la especificación vigente (Tipología familiar, Temas de la escuela de padres, Desempeño académico percibido, Lugar adecuado para estudiar en casa, Horas diarias de estudio). El acudiente se deriva de Cobertura y es solo lectura. Revisión de factores para trabajo social y rector.
- Historial académico (G.8.HIS.1–3): página de solo lectura con filtros año, matrícula, asignatura y períodos; enfoque evaluativo y formativo (las observaciones aparecen como «General»). Entradas desde el historial del estudiante y desde la caracterización. La consulta queda registrada en el backend y no se cachea.
- Cruces: Observador permite al docente «Reportar salud mental» con el estudiante precargado; «Mis reportes y remisiones» etiqueta SENAL_SALUD_MENTAL; el historial del estudiante muestra sus estrategias; el detalle de valoración muestra el resumen de la caracterización con enlace; el selector de Estrategia del plan es fijo al modificar una acción guardada y el detalle del plan muestra la estrategia.
- Regla 24: abrir caso de convivencia desde el plan (página que reutiliza piezas de Convivencia).

**Fuera de alcance**

- 9.9–9.11, territorial y metas.
- SIMPADE (G.8.VAL.4): sin estructura. El botón se muestra deshabilitado.
- Gestionar (9.11, G.8.GAL): sin backend. La acción se muestra deshabilitada.

## Decisiones

**2026-11-12**

- Parámetros de riesgo, Salud mental e Indicadores son pestañas dentro de Prevención. Las pestañas por rol ya no se deciden por sondeos (ver 2026-11-13).
- Establecimiento y sede/jornada salen de `GET /prevencion/opciones/sedes-jornadas` sin `ESTABLECIMIENTO` (requiere el cambio de SSO PR #994). Nunca de `/informes/sedes`.
- Diseño: páginas propias para lo que el prototipo dibuja como página (historial, valorar, nuevo y editar plan, detalle de plan, detalle de valoración, señal, reporte, abrir caso). Diálogos solo para modales (ofrecer plan, avance, aceptación, marcar, anular, valoración crítica, atención, cerrar señal).
- Lógica en hooks; componentes atómicos. Las acciones de fila son `AccionesFila`: iconos en el hover si son cuatro o menos, cuatro iconos más ⋮ si son cinco o más.
- «Columnas visibles» lista todas las columnas salvo las de acciones (`accessorFn` + `meta.label`).
- Páginas a todo el ancho; `max-w` solo en diálogos.
- Las acciones que llegan con la bandera en `false` se muestran deshabilitadas.
- El nivel de riesgo puede llegar `null` (rol sin acceso sensible): se muestra «—».
- Las listas (`NIVEL_RIESGO`, `TIPO_ACCION_PREVENTIVA`) se muestran por su etiqueta, nunca por código.
- La aceptación presencial sube primero el soporte (`POST /prevencion/soporte`, multipart, campo `SOPORTE`, PDF o imagen de hasta 10 MB) y envía el pk resultante como `FK_SOPORTE`.

**2026-11-13**

- Pestañas por rol decididas por `GET /prevencion/acceso` (reemplaza los sondeos de 2026-11-12). Rector: todas. Coordinador y Orientación: todas salvo Parámetros. Trabajo social: Tablero, Valoraciones, Salud mental, Estrategias y Caracterización. Docente: Tablero, Valoraciones y Estrategias.
- Todos los botones de agregar usan `ControlPointIcon`.
- Las etiquetas flotantes van en una sola línea; las celdas son más anchas para las etiquetas largas.
- Tipo de estrategia de permanencia: 38 valores según la especificación vigente consultada el 2026-11-13, con la marca «Del SIMPADE» en `TLISTA_VALOR.ACCION = 'DEL_SIMPADE'` (sin columna nueva).
- Caracterización: guardar confirma la caracterización (el backend la deja Confirmada con fecha y autor). Sin fila, se ve la copia del año anterior (Por confirmar) o la hoja en blanco (Sin diligenciar).
- Caracterización: la revisión de factores de vulnerabilidad es una acción aparte de la confirmación familiar, habilitada por `puede_revisar_factores`.
- Historial académico: la consulta se pide siempre al backend (queda registrada) y no se reconsulta al enfocar la ventana.
- Estrategias: el detalle muestra la efectividad (beneficiarios frente a no beneficiarios del mismo Período Académico) solo si el backend la trae.

## Rutas de la app

Declaradas en `src/config/paths.ts` (bajo `/app`):

| Ruta (sin `/app`) | Pantalla |
|---|---|
| `gestion-estudiantil/prevencion-retencion` | Página de Prevención con pestañas (menú `PREVENCION_RETENCION`, V639) |
| `gestion-estudiantil/prevencion-retencion/valorar` | Valorar (página) |
| `gestion-estudiantil/prevencion-retencion/plan/nuevo` | Nuevo plan |
| `gestion-estudiantil/prevencion-retencion/plan/$planId/editar` | Modificar plan |
| `gestion-estudiantil/prevencion-retencion/plan/$planId` | Detalle de plan |
| `gestion-estudiantil/prevencion-retencion/plan/$planId/caso-convivencia` | Abrir caso de convivencia (Regla 24) |
| `gestion-estudiantil/prevencion-retencion/valoracion/$valoracionId` | Detalle de valoración |
| `gestion-estudiantil/prevencion-retencion/historial/$matricula` | Historial del estudiante |
| `gestion-estudiantil/prevencion-retencion/estrategias/nueva` | Nueva estrategia |
| `gestion-estudiantil/prevencion-retencion/estrategias/$estrategiaId/editar` | Modificar estrategia |
| `gestion-estudiantil/prevencion-retencion/estrategias/$estrategiaId` | Detalle de estrategia |
| `gestion-estudiantil/prevencion-retencion/caracterizacion/$matricula` | Caracterización familiar y de vivienda (ver detalle) |
| `gestion-estudiantil/prevencion-retencion/caracterizacion/$matricula/editar` | Modificar caracterización |
| `gestion-estudiantil/prevencion-retencion/historial-academico/$matricula` | Historial académico |
| `gestion-estudiantil/prevencion-retencion/salud-mental/nuevo` | Reporte de salud mental |
| `gestion-estudiantil/prevencion-retencion/salud-mental/$senalId` | Detalle de señal de salud mental |

## Endpoints usados

Prefijo de servicio: `eval-col`, base `/gestion-estudiantil/prevencion`. Solo los del alcance.

**Acceso y tablero**

- `GET /acceso` (pestañas y banderas por rol)
- `GET /tablero`
- `GET /estudiantes/:MATRICULA/alertas`
- `GET /estudiantes/:MATRICULA/historial`
- `POST /valoraciones`
- `POST /planes`
- `PUT /planes/:ID`

**Valoraciones y planes**

- `GET /valoraciones`
- `GET /valoraciones/:ID`
- `POST /valoraciones/:ID/anular`
- `GET /planes/:ID`
- `POST /planes/:ID/marcar`
- `POST /planes/:ID/anular`
- `POST /planes/:ID/aceptacion-presencial`
- `GET /planes/:ID/soporte`
- `POST /planes/:ID/caso-convivencia` (Regla 24)
- `POST /soporte` (file-service)
- `POST /acciones/:ID/avances`

**Estrategias (9.7)**

- `GET /estrategias`
- `POST /estrategias`
- `GET /estrategias/:ID` (beneficiarios paginados)
- `PUT /estrategias/:ID`
- `GET /estrategias/:ID/matriculados` (también para «Seleccionar todos», página a página)
- `GET /estrategias/:ID/grados`
- `POST /estrategias/:ID/copiar`
- `POST /estrategias/:ID/beneficiarios`
- `POST /estrategias/beneficiarios/:ID/retirar`
- `POST /estrategias/:ID/finalizar`

**Caracterización (9.8)**

- `GET /caracterizaciones`
- `GET /caracterizaciones/:MATRICULA` (registra la consulta)
- `PUT /caracterizaciones/:MATRICULA` (`DATOS` como JSON serializado)
- `POST /caracterizaciones/:MATRICULA/revision-factores`

**Historial académico (G.8.HIS)**

- `GET /estudiantes/:MATRICULA/historial-academico/opciones`
- `GET /estudiantes/:MATRICULA/historial-academico` (registra la consulta; sin caché)

**Salud mental**

- `GET /salud-mental`
- `GET /salud-mental/:ID`
- `POST /salud-mental`
- `POST /salud-mental/:ID/valoracion`
- `POST /salud-mental/:ID/atenciones`
- `POST /salud-mental/:ID/cerrar`

**Indicadores**

- `GET /indicadores`
- `GET /indicadores/gestion`
- `POST /indicadores/exportar` (reporting-service, clave `prevencion-indicadores`)

**Parámetros de riesgo**

- `GET /parametros`
- `PUT /parametros`

**Opciones de filtros y formularios**

- `GET /opciones/estudiantes`
- `GET /opciones/estudiantes-salud-mental`
- `GET /opciones/responsables`
- `GET /opciones/grupos`
- `GET /opciones/periodos`
- `GET /opciones/periodos-academicos`
- `GET /opciones/motivos-retiro`
- `GET /opciones/sedes-jornadas`
- `GET /opciones/estrategias` (selector de Estrategia del plan)
- `GET /opciones/caracterizacion` (listas del formulario)
- `GET /opciones/caracterizacion-filtros`
- `GET /select/:CATEGORIA` (`NIVEL_RIESGO`, `TIPO_ACCION_PREVENTIVA`)

## Ficheros

Rutas relativas a `src/features/gestion-estudiantil/prevencion/`. Total: 186 ficheros. Los marcados **(nuevo)** se añadieron en esta entrega.

**api/** (21)

- `api/query-keys.ts`: claves de React Query del módulo.
- `api/types.ts`: tipos de filas y cuerpos de escritura.
- `api/ui-mappings.ts`: etiquetas y colores de estados y niveles.
- `api/query/use-tablero-query.ts`: tablero, alertas, historial y `BASE_PREVENCION`.
- `api/query/use-valoraciones-query.ts`: listado y detalle de valoraciones, plan y soporte.
- `api/query/use-salud-mental-query.ts`: listado, acceso y detalle de señal.
- `api/query/use-opciones-prevencion-query.ts`: opciones de filtros y formularios.
- `api/query/use-parametros-indicadores-query.ts`: parámetros, indicadores, IE-01 y acceso.
- `api/query/use-estrategias-query.ts` **(nuevo)**: `useEstrategiasQuery` (listado), `useEstrategiaQuery` (detalle con beneficiarios paginados), `useMatriculadosEstrategiaQuery` y `pedirMatriculados` (matriculados Cursando), `useGradosEstrategiaQuery` (filtro Grado) y `toEstrategiasFilters`.
- `api/query/use-caracterizacion-query.ts` **(nuevo)**: `useCaracterizacionesQuery` (listado), `useCaracterizacionFiltrosQuery`, `useOpcionesCaracterizacionQuery` (listas del formulario), `useCaracterizacionQuery` (detalle, sin reconsulta al enfocar) y `toCaracterizacionesFilters`.
- `api/query/use-historial-academico-query.ts` **(nuevo)**: `useHistorialAcademicoOpcionesQuery` (años, matrículas, períodos y asignaturas) y `useHistorialAcademicoQuery` (la consulta, sin caché).
- `api/mutations/use-prevencion-mutation.ts`: base de mutaciones que invalida las claves.
- `api/mutations/valoraciones.ts`: valorar, anular valoración.
- `api/mutations/planes.ts`: crear, modificar, marcar y anular plan.
- `api/mutations/soporte-prevencion.ts`: subida del soporte de aceptación.
- `api/mutations/caso-convivencia.ts`: abrir caso de convivencia desde el plan.
- `api/mutations/salud-mental.ts`: reportar, valorar, atender y cerrar señal.
- `api/mutations/parametros.ts`: guardar parámetros de riesgo.
- `api/mutations/exportar-indicadores.ts`: export Excel de indicadores.
- `api/mutations/estrategias.ts` **(nuevo)**: `useCrearEstrategia`, `useModificarEstrategia`, `useCopiarEstrategia`, `useAgregarBeneficiarios`, `useRetirarBeneficiario` y `useFinalizarEstrategia`.
- `api/mutations/caracterizacion.ts` **(nuevo)**: `useGuardarCaracterizacion` (PUT con `DATOS` serializado) y `useRevisarFactores`.

**hooks/** (27)

- `hooks/use-ambito-prevencion.ts`: establecimiento y sede/jornada del usuario.
- `hooks/use-navegacion-prevencion.ts`: navegación entre pantallas del módulo.
- `hooks/use-selector-estudiante-prevencion.ts`: selector de estudiante.
- `hooks/use-tablero-filtros.ts`: filtros del tablero.
- `hooks/use-valoraciones-filtros.ts`: filtros del listado de valoraciones.
- `hooks/use-indicadores-filtros.ts`: filtros de indicadores.
- `hooks/use-salud-mental-filtros.ts`: filtros del listado de salud mental.
- `hooks/use-salud-mental-lista.ts`: listado de señales.
- `hooks/use-valorar-form.ts`: formulario de valoración.
- `hooks/use-plan-form.ts`: formulario de plan.
- `hooks/use-opciones-plan.ts`: opciones de los selectores del plan.
- `hooks/use-plan-detalle.ts`: datos del detalle de plan.
- `hooks/use-valoracion-detalle.ts`: datos del detalle de valoración.
- `hooks/use-abrir-caso-form.ts`: formulario de abrir caso de convivencia.
- `hooks/use-reporte-salud-mental-form.ts`: formulario de reporte de salud mental.
- `hooks/use-senal-detalle.ts`: datos del detalle de señal.
- `hooks/use-estrategias-filtros.ts` **(nuevo)**: búsqueda, filtros aplicados y borrador del panel de Estrategias.
- `hooks/use-estrategias-lista.ts` **(nuevo)**: consulta, tabla y acciones de la pestaña Estrategias.
- `hooks/use-estrategia-detalle.ts` **(nuevo)**: consulta de la estrategia, tabla paginada de beneficiarios y diálogos del detalle.
- `hooks/use-estrategia-form.ts` **(nuevo)**: estado del formulario de estrategia (crea, o modifica si recibe la estrategia inicial).
- `hooks/use-agregar-beneficiarios-form.ts` **(nuevo)**: estado, selección entre páginas y envío de «Agregar beneficiarios».
- `hooks/use-caracterizaciones-filtros.ts` **(nuevo)**: búsqueda, filtros aplicados y borrador del panel de Caracterización.
- `hooks/use-caracterizaciones-lista.ts` **(nuevo)**: consulta, tabla y acciones de la pestaña Caracterización.
- `hooks/use-caracterizacion-form.ts` **(nuevo)**: estado, validación y guardado del formulario de caracterización; con `vista` muestra los mismos campos sin edición.
- `hooks/use-revision-factores.ts` **(nuevo)**: revisión de factores de vulnerabilidad, acción aparte de la confirmación (`puede_revisar_factores`).
- `hooks/use-historial-academico.ts` **(nuevo)**: opciones en cascada Año → Matrícula → Asignatura y Períodos, consulta y resultados.
- `hooks/use-entrada-historial-academico.ts` **(nuevo)**: habilita la entrada a «Consultar historial académico» con `puede_historial_academico`.

**utils/** (14)

- `utils/alertas.ts`: reglas de presentación de alertas.
- `utils/historial.ts`: agrupación de la línea de tiempo.
- `utils/indicadores.ts`: cálculo y formato de indicadores.
- `utils/indicadores.test.ts`: pruebas de `indicadores.ts`.
- `utils/parametros.ts`: validación y formato de parámetros de riesgo.
- `utils/parametros.test.ts`: pruebas de `parametros.ts`.
- `utils/formularios.ts`: validaciones de formularios de valoración y plan.
- `utils/formularios-seguimiento.ts`: validaciones de avance, aceptación y marcado.
- `utils/formularios-salud-mental.ts`: validaciones de salud mental.
- `utils/formularios-estrategias.ts` **(nuevo)**: límites y validaciones de estrategia, copia, retiro, finalizar y fecha de ingreso, más los formateadores de beneficiarios, rangos de fechas, porcentajes y rendimiento.
- `utils/formularios-estrategias.test.ts` **(nuevo)**: pruebas de `formularios-estrategias.ts`.
- `utils/formularios-caracterizacion.ts` **(nuevo)**: límites y códigos estables, agrupación de listas, valores del formulario, validaciones y armado de `DATOS`.
- `utils/historial-academico.ts` **(nuevo)**: `formatNota`, `etiquetaMatricula`, `filasObservaciones`, `textoNota` y `PERIODO_FINAL`.
- `utils/historial-academico.test.ts` **(nuevo)**: pruebas de `historial-academico.ts`.

**components/** (110)

- tablero/ (4)
  - `components/tablero/tablero-tab.tsx`: pestaña Tablero de alertas.
  - `components/tablero/columns-tablero.tsx`: columnas del tablero.
  - `components/tablero/search-tablero.tsx`: buscador y filtros del tablero.
  - `components/tablero/menu-acciones-tablero.tsx`: acciones de fila del tablero.
- dialogos/ (6)
  - `components/dialogos/use-dialogos-prevencion.tsx`: apertura de los diálogos del módulo.
  - `components/dialogos/dialog-ofrecer-plan.tsx`: ofrecer plan tras valorar.
  - `components/dialogos/dialog-registrar-avance.tsx`: registrar avance de acción.
  - `components/dialogos/dialog-aceptacion-presencial.tsx`: aceptación presencial con soporte.
  - `components/dialogos/dialog-marcar-plan.tsx`: marcar plan.
  - `components/dialogos/dialog-anular-prevencion.tsx`: anular plan o valoración.
- historial/ (3)
  - `components/historial/linea-tiempo.tsx`: línea de tiempo del historial.
  - `components/historial/resumen-historial.tsx`: resumen del historial.
  - `components/historial/estrategias-historial.tsx` **(nuevo)**: `EstrategiasHistorial`, lista «Estrategias» del estudiante con enlace al detalle de cada una.
- historial-academico/ (5) **(nuevo)**
  - `components/historial-academico/pantalla-historial-academico.tsx`: `PantallaHistorialAcademico`, página con estudiante, establecimiento, filtros y resultado.
  - `components/historial-academico/filtros-historial-academico.tsx`: `FiltrosHistorialAcademico`, filtros Año, Matrícula, Asignatura y Períodos.
  - `components/historial-academico/resultados-historial-academico.tsx`: `ResultadosHistorialAcademico`, muestra el enfoque Evaluativo o Formativo.
  - `components/historial-academico/columns-resultados.tsx`: `buildColumnsEvaluativo` y `buildColumnsFormativo`.
  - `components/historial-academico/celda-nota.tsx`: `CeldaNota`, nota del período con su recuperación y valoración.
- valoraciones/ (4)
  - `components/valoraciones/valoraciones-tab.tsx`: pestaña Valoraciones y planes.
  - `components/valoraciones/columns-valoraciones.tsx`: columnas del listado.
  - `components/valoraciones/search-valoraciones.tsx`: buscador y filtros del listado.
  - `components/valoraciones/menu-acciones-valoracion.tsx`: acciones de fila de valoraciones.
- indicadores/ (5)
  - `components/indicadores/indicadores-tab.tsx`: pestaña Indicadores.
  - `components/indicadores/columns-indicadores.tsx`: columnas de indicadores.
  - `components/indicadores/search-indicadores.tsx`: filtros de indicadores.
  - `components/indicadores/resumen-indicadores.tsx`: tarjetas de resumen.
  - `components/indicadores/tabla-simple.tsx`: tabla de agrupamiento.
- parametros/ (1)
  - `components/parametros/parametros-tab.tsx`: pestaña Parámetros de riesgo.
- plan/detalle/ (7)
  - `components/plan/detalle/plan-detalle-contenido.tsx`: contenido de la página de detalle de plan.
  - `components/plan/detalle/encabezado-plan.tsx`: encabezado del plan.
  - `components/plan/detalle/resumen-origen.tsx`: origen del plan (valoración).
  - `components/plan/detalle/seccion-acciones-plan.tsx`: sección de acciones.
  - `components/plan/detalle/seccion-avances.tsx`: sección de avances.
  - `components/plan/detalle/seccion-aceptacion.tsx`: sección de aceptación.
  - `components/plan/detalle/soporte-aceptacion.tsx`: soporte de aceptación presencial.
- plan/caso/ (1)
  - `components/plan/caso/formulario-abrir-caso.tsx`: formulario de abrir caso de convivencia.
- form/ (2)
  - `components/form/pantalla-plan.tsx`: pantalla compartida de nuevo y modificar plan.
  - `components/form/accion-plan-item.tsx`: ítem de acción del plan.
- valoracion/detalle/ (4)
  - `components/valoracion/detalle/valoracion-detalle-contenido.tsx`: contenido de la página de detalle de valoración.
  - `components/valoracion/detalle/encabezado-valoracion.tsx`: encabezado de la valoración.
  - `components/valoracion/detalle/seccion-valoracion.tsx`: sección de datos de la valoración.
  - `components/valoracion/detalle/seccion-caracterizacion.tsx` **(nuevo)**: `SeccionCaracterizacion`, resumen de la caracterización del estudiante con enlace a su página.
- salud-mental/ (6)
  - `components/salud-mental/salud-mental-tab.tsx`: pestaña Salud mental.
  - `components/salud-mental/columns-salud-mental.tsx`: columnas del listado.
  - `components/salud-mental/search-salud-mental.tsx`: filtros del listado.
  - `components/salud-mental/acciones-senal.tsx`: acciones de la señal.
  - `components/salud-mental/menu-acciones-salud-mental.tsx`: acciones de fila.
  - `components/salud-mental/badges-senal.tsx`: insignias de severidad y estado.
- salud-mental/dialogos/ (5)
  - `components/salud-mental/dialogos/use-dialogos-salud-mental.tsx`: apertura de los diálogos de salud mental.
  - `components/salud-mental/dialogos/resumen-senal-dialogo.tsx`: resumen de la señal en diálogo.
  - `components/salud-mental/dialogos/dialog-valoracion-critica.tsx`: valoración con modal crítico.
  - `components/salud-mental/dialogos/dialog-registrar-atencion.tsx`: registrar atención.
  - `components/salud-mental/dialogos/dialog-cerrar-senal.tsx`: cerrar señal.
- salud-mental/detalle/ (5)
  - `components/salud-mental/detalle/senal-detalle-contenido.tsx`: contenido de la página de detalle de señal.
  - `components/salud-mental/detalle/encabezado-senal.tsx`: encabezado de la señal.
  - `components/salud-mental/detalle/resumen-senal.tsx`: resumen de la señal.
  - `components/salud-mental/detalle/seccion-valoracion-senal.tsx`: sección de valoración.
  - `components/salud-mental/detalle/seccion-atencion.tsx`: sección de atención.
- salud-mental/form/ (1)
  - `components/salud-mental/form/campos-reporte-salud-mental.tsx`: campos del reporte.
- estrategias/ (23) **(nuevo)**
  - `components/estrategias/estrategias-tab.tsx`: `EstrategiasTab`, pestaña Estrategias (§9.7).
  - `components/estrategias/search-estrategias.tsx`: `SearchEstrategias`, buscador y panel con Sede, Jornada, Tipo y Estado.
  - `components/estrategias/columns-estrategias.tsx`: `buildColumnsEstrategias`, columnas del listado (Sede y Jornada ocultas).
  - `components/estrategias/menu-acciones-estrategia.tsx`: `MenuAccionesEstrategia`, acciones de fila (cuatro iconos y ⋮).
  - `components/estrategias/acciones-estrategia.tsx`: `accionesEstrategia` y `ACCIONES_ESTRATEGIA`, acciones permitidas según el backend.
  - `components/estrategias/badge-estado-estrategia.tsx`: `BadgeEstadoEstrategia` (Planeada, En ejecución, Finalizada) y `BadgeMatricula`.
  - `components/estrategias/detalle/estrategia-detalle-contenido.tsx`: `EstrategiaDetalleContenido`, contenido de la página de detalle.
  - `components/estrategias/detalle/encabezado-estrategia.tsx`: `EncabezadoEstrategia`, título con estado y acciones (Agregar beneficiarios, Modificar, ⋮ con Copiar y Finalizar).
  - `components/estrategias/detalle/ficha-estrategia.tsx`: `FichaEstrategia`, datos de la estrategia y su resultado si cerró.
  - `components/estrategias/detalle/efectividad-estrategia.tsx`: `EfectividadEstrategia`, beneficiarios frente a no beneficiarios.
  - `components/estrategias/detalle/tabla-beneficiarios.tsx`: `TablaBeneficiarios`, beneficiarios paginados.
  - `components/estrategias/detalle/columns-beneficiarios.tsx`: `buildColumnsBeneficiarios`, columnas de beneficiarios.
  - `components/estrategias/form/pantalla-estrategia.tsx`: `PantallaEstrategia`, pantalla de nueva y modificar estrategia.
  - `components/estrategias/form/campos-estrategia.tsx`: `CamposEstrategia`, campos del formulario y requisitos de ingreso.
  - `components/estrategias/form/bloque-beneficiarios.tsx`: `BloqueBeneficiarios`, beneficiarios dentro de modificar (Retirar, Agregar, «… y N más»).
  - `components/estrategias/form/campo-texto.tsx`: `CampoTexto`, campo de una línea con contador y error.
  - `components/estrategias/dialogos/use-dialogos-estrategias.tsx`: `useDialogosEstrategias`, un solo modal de operación abierto a la vez.
  - `components/estrategias/dialogos/dialog-agregar-beneficiarios.tsx`: `DialogAgregarBeneficiarios`, agregar beneficiarios con fecha de ingreso común.
  - `components/estrategias/dialogos/lista-matriculados.tsx`: `ListaMatriculados`, casillas con «Seleccionar todos» sobre todas las páginas.
  - `components/estrategias/dialogos/search-matriculados.tsx`: `SearchMatriculados`, búsqueda por nombre o documento y filtro Grado.
  - `components/estrategias/dialogos/dialog-retirar-beneficiario.tsx`: `DialogRetirarBeneficiario`, fecha de salida, Resultado de la salida y Motivo.
  - `components/estrategias/dialogos/dialog-copiar-estrategia.tsx`: `DialogCopiarEstrategia`, copia con fechas nuevas.
  - `components/estrategias/dialogos/dialog-finalizar-estrategia.tsx`: `DialogFinalizarEstrategia`, Resultado de la estrategia (sugiere «No se ejecutó» si estaba Planeada).
- caracterizacion/ (27) **(nuevo)**
  - `components/caracterizacion/caracterizaciones-tab.tsx`: `CaracterizacionesTab`, pestaña Caracterización (§9.8).
  - `components/caracterizacion/search-caracterizaciones.tsx`: `SearchCaracterizaciones`, buscador y panel con Sede, Jornada, Grado/Grupo y Estado.
  - `components/caracterizacion/columns-caracterizaciones.tsx`: `buildColumnsCaracterizaciones`, columnas del listado.
  - `components/caracterizacion/menu-acciones-caracterizacion.tsx`: `MenuAccionesCaracterizacion`, Ver y Modificar (deshabilitado sin `puede_modificar`).
  - `components/caracterizacion/badge-estado-caracterizacion.tsx`: `BadgeEstadoCaracterizacion` (Sin diligenciar, Por confirmar, Confirmada).
  - `components/caracterizacion/form/pantalla-caracterizacion.tsx`: `PantallaCaracterizacion`, encabezado, secciones y revisión de factores aparte.
  - `components/caracterizacion/form/seccion-matricula.tsx`: `SeccionMatricula`, datos de matrícula en solo lectura.
  - `components/caracterizacion/form/trayectoria-calculada.tsx`: `TrayectoriaCalculadaBloque`, trayectoria calculada en solo lectura.
  - `components/caracterizacion/form/seccion-trayectoria.tsx`: `SeccionTrayectoria`, trayectoria declarada y calculada.
  - `components/caracterizacion/form/seccion-nucleo-familiar.tsx`: `SeccionNucleoFamiliar`, personas en el hogar, integrantes y estado civil de los padres.
  - `components/caracterizacion/form/bloque-integrantes.tsx`: `BloqueIntegrantes`, constructor de integrantes con el acudiente en solo lectura.
  - `components/caracterizacion/form/fila-integrante.tsx`: `FilaIntegrante`, una persona del núcleo o de apoyo.
  - `components/caracterizacion/form/seccion-componente-familiar.tsx`: `SeccionComponenteFamiliar`, componente familiar, hábitos académicos y los campos nuevos de la especificación.
  - `components/caracterizacion/form/seccion-registro-establecimiento.tsx`: `SeccionRegistroEstablecimiento`, registro que solo editan los funcionarios.
  - `components/caracterizacion/form/seccion-situacion-estudiante.tsx`: `SeccionSituacionEstudiante`, situación del estudiante.
  - `components/caracterizacion/form/seccion-socioeconomica.tsx`: `SeccionSocioeconomica`, ingresos, aportantes y programas sociales.
  - `components/caracterizacion/form/seccion-vivienda.tsx`: `SeccionVivienda`, tipo, tenencia y servicios de la vivienda.
  - `components/caracterizacion/form/seccion-internet-equipo.tsx`: `SeccionInternetEquipo`, conexión y equipo para estudiar.
  - `components/caracterizacion/form/seccion-estrategias.tsx`: `SeccionEstrategias`, estrategias que el estudiante requeriría (no crea beneficiario).
  - `components/caracterizacion/form/seccion-factores.tsx`: `SeccionFactores`, factores de vulnerabilidad con su acción «Registrar revisión».
  - `components/caracterizacion/form/fila-factor.tsx`: `FilaFactor`, un factor con su fuente, fecha y motivo al desmarcarlo.
  - `components/caracterizacion/form/historial-factores.tsx`: `HistorialFactores`, factores que dejaron de aplicar y revisiones registradas.
  - `components/caracterizacion/form/dialogo-confirmar-limpieza.tsx`: `DialogoConfirmarLimpieza`, aviso antes de limpiar selecciones dependientes.
  - `components/caracterizacion/form/campo-lista.tsx`: `CampoLista`, combo de una lista (por etiqueta).
  - `components/caracterizacion/form/campo-casillas.tsx`: `CampoCasillas`, selección múltiple.
  - `components/caracterizacion/form/campo-si-no.tsx`: `CampoSiNo`, Sí/No sin valor predeterminado.
  - `components/caracterizacion/form/campo-fecha.tsx`: `CampoFecha`, fecha dd/mm/aaaa con error en línea.
- raíz de components/ (1)
  - `components/boton-volver.tsx`: botón de volver.

**pages/** (13)

- `pages/prevencion-page.tsx`: página con pestañas (Tablero, Valoraciones, Salud mental, Estrategias, Caracterización, Indicadores y Parámetros), según `/acceso`.
- `pages/historial-page.tsx`: historial del estudiante, con sus estrategias.
- `pages/valorar-page.tsx`: valorar.
- `pages/plan-form-page.tsx`: nuevo y modificar plan.
- `pages/plan-detalle-page.tsx`: detalle de plan.
- `pages/valoracion-detalle-page.tsx`: detalle de valoración.
- `pages/abrir-caso-page.tsx`: abrir caso de convivencia.
- `pages/senal-salud-mental-page.tsx`: detalle de señal.
- `pages/reporte-salud-mental-page.tsx`: reporte de salud mental.
- `pages/estrategia-form-page.tsx` **(nuevo)**: `EstrategiaNuevaPage` y `EstrategiaEditarPage`.
- `pages/estrategia-detalle-page.tsx` **(nuevo)**: `EstrategiaDetallePage`, detalle de la estrategia.
- `pages/caracterizacion-page.tsx` **(nuevo)**: `CaracterizacionDetallePage` (ver) y `CaracterizacionEditarPage` (modificar).
- `pages/historial-academico-page.tsx` **(nuevo)**: `HistorialAcademicoPage`, página de solo lectura del historial académico.

**docs/** (1)

- `docs/prevencion.md`: este documento.

## Fases

1. Hecha. API, tipos y claves; página con pestañas y ruta; Tablero.
2. Hecha. Historial, valorar, nuevo y modificar plan, diálogos del tablero.
3. Hecha. Valoraciones y planes: listado, detalles, avance, aceptación presencial, marcar, anular.
4. Hecha. Indicadores y Parámetros de riesgo.
5. Hecha. Salud mental (9.6) y Regla 24.
6. Hecha. Cruces: Observador («Reportar salud mental»), Mis reportes y remisiones, historial del estudiante, detalle de valoración, selector de Estrategia del plan.
7. Hecha. Estrategias (9.7): listado, detalle, nueva y modificar, beneficiarios, retirar, copiar, finalizar.
8. Hecha. Caracterización (9.8): listado, lectura y edición, revisión de factores.
9. Hecha. Historial académico (G.8.HIS).

## Probado

Probado en navegador contra el servidor local, sin mocks:

- Tablero: rector, orientación, coordinador, trabajo social y docente.
- Historial.
- Valorar, ofrecer plan y nuevo plan (valoración 206).
- Detalle de plan.
- Anular valoración y anular plan (408), como rector.
- Salud mental completa: señal 139289, de Crítico a atención y cerrada.
- Página abrir caso: caso CC-2026-0031 vinculado al plan 409 (creado por API).
- Pestañas por rol, verificadas en navegador: Rector todas; Coordinador y Orientación todas salvo Parámetros; Trabajo social Tablero, Valoraciones, Salud mental, Estrategias y Caracterización; Docente Tablero, Valoraciones y Estrategias.
- Estrategias: listado y detalle; crear, modificar, agregar beneficiarios, retirar, copiar y finalizar (rector); orientación con acciones deshabilitadas por banderas.
- Caracterización: guardado confirmado; validaciones en línea; revisión de factores por rector y trabajo social; trabajo social sin edición.
- Etiqueta larga corregida (filtros y etiquetas flotantes en una línea).
- Entrada desde Observador como docente («Reportar salud mental» con el estudiante precargado).

Sin probar:

- «Seleccionar todos» con más de una página (solo hay 5 matrículas en el fixture).
- Historial académico con datos reales: el fixture no tiene matrícula de otro año. El evaluativo se vio con datos simulados; el formativo no se llegó a renderizar.
- Aceptación presencial, avance y marcar: no hay almacenamiento de archivos en local (502).
- Export Excel: reporting-service (503).
- Avisos: notificaciones (503).

Comprobaciones:

- 2026-11-13, al cerrar esta entrega:
  - `tsc -b`: solo los 7 errores que ya existían (`segundo-factor.tsx` y `campus-maps.tsx`).
  - `oxlint` sobre `gestion-estudiantil`, `router.tsx` y `paths.ts`: un aviso en `catalogo-anotaciones/components/table/columns-codigos.tsx`, fichero que esta rama no toca.
  - `vitest run` completo: 234 ficheros y 1549 tests, todos en verde. Incluye `formularios-estrategias.test.ts` e `historial-academico.test.ts`.

## Bitácora

**2026-11-12**

- Plan aprobado y rama creada según el nombre previsto.
- Entorno local verificado: login de cuatro usuarios de prueba y siete endpoints en 200.
- Los 403 en parámetros para quien no es Rector son esperados.
- Fase 1: API, tipos, claves, página con pestañas y ruta; Tablero.
- Historial, valorar y plan pasan a páginas propias (no diálogos).
- Sedes y jornadas por `opciones/sedes-jornadas` de prevención.
- Refactor a hooks y componentes atómicos.
- Detalle de plan atómico.
- Columnas ocultables en «Columnas visibles».
- Páginas a todo el ancho.
- Lote de completitud B1–B7, G1, G5, G6 y G9.
- Pestaña Indicadores por rol.
- Salud mental (9.6) y Regla 24 abrir caso desde el plan.

**2026-11-13**

- Análisis de la especificación vigente: Tipo de estrategia con 38 valores y marca «Del SIMPADE».
- Backend SSO PR #996 y su revisión.
- Cruces: Observador, Mis reportes y remisiones (SENAL_SALUD_MENTAL), historial del estudiante, detalle de valoración y selector de Estrategia del plan.
- Fase Estrategias (9.7).
- Fase Caracterización (9.8).
- Fase Historial académico (G.8.HIS).
- Correcciones de icono (`ControlPointIcon` en los botones de agregar) y de etiqueta flotante (una línea).

## Decisiones pendientes

**(a) Gestor administrativo sin acceso a Parámetros.** Las pestañas ya salen de `GET /prevencion/acceso`. Parámetros se decide solo para el Rector; el gestor administrativo no está verificado en navegador.

**(b) Gestionar 9.11 sin backend.** Suposición: la acción queda deshabilitada.

**(c) SIMPADE sin estructura.** Suposición: el botón queda deshabilitado.

**(d) Oferta de Crear plan tras valorar.** Usa `puede_valorar` más plan abierto, no `puede_crear_plan` (Regla 40, coordinador). Pedir la bandera al backend en el historial.

**(e) Mensaje tras acciones de salud mental, estrategias y caracterización.** Muestra la etiqueta de auditoría del backend («Prevención y retención: …»). Revisar el origen.

**(f) Etiqueta de asignaturas reprobadas.** El prototipo dice «Asignaturas reprobadas» y la spec «[Áreas] reprobadas». Decidir cuál usar.

**(g) Menú «Columnas visibles».** Trunca «Fecha de valoración». Componente compartido: corregir en el común.

**(h) Sondeo de Indicadores.** Pide el listado completo: el endpoint no tiene `PAGESIZE`.

**(i) Integrantes en una sola lista.** Como el prototipo; la especificación también lo define como constructor.

**(j) Listas «Por definir» del SIMPADE.** «Frecuencia de asistencia del acudiente» y «Frecuencia de cambio de domicilio» quedan deshabilitadas.

**(k) Rector sin edición fuera de las jornadas de sus asignaciones.** Decisión de producto pendiente desde #991.

**(l) Copiar estrategia no navega a la copia.** Pendiente de decidir.

**(m) Períodos del historial académico preseleccionados.** Pendiente de confirmar con producto.

**(n) Administración › Lista de valores.** Debe mostrar «Del SIMPADE» como interruptor en el tipo de estrategia.

**(o) Reintegración (#992).** Cablear `caracterizacion_disponible`.

# Período académico: cambios necesarios en el back

Lo que el front de `establishment/academic-period` ya manda o espera y el backend todavía no tiene. Referencia funcional: *Establecimiento (2).md* (versión vigente). Con mocks activos todo esto funciona; contra el back real, los campos que falten se leen con un valor por defecto (indicado en cada caso).

Convenciones de siempre: bodies en UPPER_SNAKE, flags `"S"|"N"`, respuestas en snake_case dentro de `{ rows }`.

---

## 1. Recesos con ubicación y duración (Período y Grado)

Antes: `DESCANSO_INICIO` / `DESCANSO_FIN` como `TIME[]` paralelos. Ahora cada receso tiene **Etiqueta, Ubicación y Duración**, y las horas las calcula el front con la hora de inicio, los bloques y la duración de la clase.

- Body: `RECESOS` (JSONB, array crudo, sin `JSON.stringify`):
  ```json
  [{ "label": "Recreo", "location": "BLOQUE", "afterBlock": 3, "durationMinutes": 30 }]
  ```
  - `location`: `INICIO` | `BLOQUE` | `FINAL`. `afterBlock` solo con `BLOQUE` (si no, `null`).
  - `[]` borra todos.
- Lectura: `recesos` con la misma forma (camelCase dentro del JSON, como ya se devuelve).
- Endpoints: crear/actualizar período (`POST/PUT /eval-col/periodos...`) y crear/actualizar grado (`POST/PUT /eval-col/grados...`).
- Validar (igual que el front, `validateJornadaSchedule` en `api/schema.ts`): etiqueta de 4 a 50, ubicación única, `afterBlock` entre 1 y Número de bloques, y que los recesos no sumen toda la jornada.
- Hecho en el SSO (rama fase 2): columna `RECESOS` JSONB en período y grado; el horario calcula los bloques con este modelo (`fn_horario_bloques_jornada`). Los períodos sin `RECESOS` siguen con sus descansos viejos.

## 2. Período académico: modalidad y ciclo

- Body: `MODALIDAD_MATRICULA` (`ANUAL` | `SEMESTRAL` | `TRIMESTRAL` | `BIMESTRAL`) y `CICLO` (número, de 1 a los ciclos de la modalidad: 1, 2, 4 o 6).
- Lectura (`fn_periodo_detalle` **y el listado**): `enrollment_modality` (mismo código) y `cycle` (número). La tabla de períodos ya muestra las columnas *Modalidad de matrícula* y *Ciclo* (C1, C2…). **Sin ellas el período se lee como Anual, ciclo 1.**
- Forman parte de la identidad del período: único por Sede + Año + Jornada + Modalidad + Ciclo (dos ciclos semestrales de la misma jornada no chocan).
- Regla 14 (hecho en el SSO, fase 1): repetido → "Ya existe un período académico para [Sede] · [Año] · [Jornada] · [Modalidad] · Ciclo [N]."; los ciclos de la misma modalidad van en orden y sin cruzarse → "Las fechas se cruzan con el ciclo [N] de la misma modalidad." Modalidades distintas sí pueden coincidir en fechas. El nombre interno agrega la modalidad y el ciclo cuando no es Anual ("2026 - MAÑANA - Semestral C2").

## 3. Períodos de evaluación (Reglas 30, 34, 35 y 36)

Validaciones de `fn_periodo_eval_crear` / `fn_periodo_eval_actualizar` que el mock ya aplica (409 con `message`):

- "La Fecha fin debe ser posterior a la Fecha inicio."
- "El primer período de evaluación no puede empezar antes del Inicio del período académico."
- "Las fechas deben estar dentro del período académico." (Fecha fin después del Fin del período académico).
- "Las fechas se cruzan con el período de evaluación [Nombre]." (los cortes no se solapan entre sí).
- "Ya existe un período de evaluación con ese Nombre." / "…con esa Abreviación." (únicos dentro del período académico, sin distinguir mayúsculas).
- "La suma de los pesos no puede superar el 100 %." (`PORCENTAJE` sumado con los demás cortes).

Estado:

- El **estado lo calcula el back con las fechas** (no se elige en el formulario): *Calificable* (`1`) si hoy está entre Fecha inicio y Fecha fin, *NO Calificable* (`2`) si no. Se recalcula al crear, al modificar y al leer, porque cambia solo con el paso de los días.
- Lectura: `status_id`, `estado`, `estado_name` ya calculados.

Listado:

- El front pide todos los cortes del período (`PAGE_SIZE` 200) y pagina en la tabla, porque el total de pesos se muestra bajo la tabla.

## 4. Grado: horario propio y jornadas de continuidad (V43 / V79)

- Body de crear/actualizar grado:
  - `PERSONALIZAR_HORARIO` `"S"|"N"`.
  - `HORA_INICIO`, `HORA_FIN`, `BLOQUES`, `RECESOS` (solo si personaliza; si no, `null` / `[]`).
  - `JORNADAS_CONTINUIDAD`: ids de jornada (`[]` si no tiene grado siguiente).
- Lectura (`fn_grado_obtener` **y el listado**): `jornadas_continuidad` (`{id, name}[]`), `personalizar_horario`, `schedule_start_time`, `schedule_end_time`, `blocks_count`, `recesos`, `groups_count`, `total_capacity`. Hoy el listado no las trae.
- `POST /eval-col/grados/query/:academicPeriodId`: listado de grados del período (lo usa la página del grado).
- `GET /eval-col/grados/:id/rotulos-referente`: rótulos del referente curricular del grado (Asignatura / Dimensión…). Debe existir aunque devuelva `rows: []`.

## 5. Grupos: "Dicta todas" (Regla 108)

- Body de crear/actualizar grupo: `DICTA_TODAS` `"S"|"N"` (solo `"S"` si hay director).
- Lectura del listado de grupos: `dicta_todas`. Sin ella se lee `No`.
- Validaciones: código hasta 20 caracteres, cupo de 1 a 99 ("El Cupo debe ser de 1 a 99.").
- **Nuevo** `GET /grupos/:id/dependencias`: el front lo consulta al pulsar Eliminar y, si algo es mayor que 0, muestra "No se puede eliminar el grupo X" con el detalle en lugar de la confirmación. Una fila:
  - `matriculas`: matrículas del grupo en Cobertura Educativa.
  - `asignaciones`: asignaciones académicas del grupo.
  - `actividades`: actividades del planeador del grupo.
  - `clases_asistencia`: clases con asistencia registrada.
  - `horarios` y `calificaciones`: el back también bloquea por ellos (`fn_grupo_validar_eliminable`).

  ```json
  { "rows": [{ "matriculas": 25, "asignaciones": 4, "horarios": 0, "actividades": 32, "clases_asistencia": 48, "calificaciones": 0 }] }
  ```
  Todos números (0 si no hay). Sin fila, el front lo toma como todo en 0 y deja eliminar.
- `PUT /grupos/:id/eliminar` debe rechazar igual (con mensaje) si el grupo tiene cualquiera de esos registros, por si cambió entre la consulta y el borrado.

## 6. Horario del grupo

- `GET /eval-col/horarios/:gradeId` (`fn_horario_listar`, id_query 80): debe responder aunque el grado no tenga horario.
- `POST /eval-col/horarios` (`fn_horario_guardar`, id_query 79) con `FK_GRADO` y `ENTRIES` (reemplazo total). El front manda las entradas de **todos** los grupos del grado, no solo del que se edita.

## 7. Plan de estudio

- Lectura: agregar `area_nombre` al listado (lo usa el aviso de la Regla 76: las obligatorias de un área deben sumar 100 %).
- Validaciones: intensidad horaria 1–40; Regla 66 (si influye en el rendimiento, exige aprobación).
- `POST /eval-col/areas/asignaturas`: debe devolver las filas completas (con área y especialidad).
- `POST /eval-col/areas` (Crear área, Regla 67): aceptar `COLOR` y validar Nombre y Abreviación únicos dentro del período (409: "Ya existe un área llamada [Nombre] en el período." / "…con la abreviación [Abreviación]…").
- `POST /eval-col/areas/:areaId/asignaturas`: crear asignatura desde "Crear asignatura" del plan de estudio. Unicidad de Nombre y Abreviación dentro del período (Regla 62).

## 8. Criterios de evaluación (Sección 5.6)

- Body de `fn_criterio_eval_actualizar` (id_query 51): `RATING_SCALE_MODE`, `RECOVERY_MODE`, `RECOVERY_PERCENTAGE`.
- Lectura: `rating_scale_mode`, `recovery_mode`, `recovery_percentage`.
- `SET_GRADING_SCALE` ahora va en `true` solo si llega una escala (antes siempre `true`): no debe borrar la escala guardada cuando llega `false`.

## 9. Criterios de promoción (Regla 105)

- Body: `REQUISITO_COMPLEMENTARIA` `"S"|"N"`, `REQUISITOS_PROPIOS` (`string[]`, hasta 10, de 3 a 80 caracteres).
- Lectura: `requisito_complementaria`, `requisitos_propios`. Sin ellas: No y ninguno.
- **Nuevo** `REQUISITOS_NORMA` (`string[]`) en el body y `requisitos_norma` en la lectura: los requisitos de la norma que el período marca. Códigos: `APROBAR_GRADO`, `SERVICIO_SOCIAL`, `ESTUDIOS_CONSTITUCIONALES`, `SIN_AREAS_PENDIENTES`. Sin la columna el front los toma todos marcados (antes siempre aplicaban).
- Lectura esperada (fila de `GET /periodos/:id/criterio-promocion`, con o sin `FK_GRADO`), además de los campos de siempre:
  ```json
  { "requisito_complementaria": "S", "requisitos_norma": ["APROBAR_GRADO", "SERVICIO_SOCIAL"], "requisitos_propios": ["Presentó la prueba Saber 11"] }
  ```
- Desde la página del grado, el botón *Guardar* del encabezado guarda el grado y, si se tocaron, sus criterios con el mismo `PUT` de siempre (con `FK_GRADO`).
- La lectura con `FK_GRADO` debe devolver el override del grado o, si no tiene, **los del período** (hoy puede volver vacío).
- Grado con Referente Formativo (Regla 106, punto 5): el front los muestra en solo lectura; el back debería rechazar el guardado para ese grado.
- "Restablecer a los valores del período": `PUT /periodos/:ID/criterio-promocion/restablecer` con `{ FK_GRADO }` (hecho en el SSO, rama de la fase 1; el front ya lo usa). Antes guardaba en el grado una copia de los criterios del período. El diálogo dice que el grado "volverá a actualizarse con los cambios del período", así que lo correcto es **borrar el override del grado** (p. ej. `DELETE` o `PUT /criterios-promocion/:periodo/grado/:grado/restablecer`) para que vuelva a heredar; avisar el endpoint para cambiar la llamada. Respuesta esperada: `{ "status": "ok" | "error", "message": "..." }`, igual que el guardado de criterios.

## 10. Escalas de valoración

- `POST /eval-col/escalas/:academicPeriodId` con `{ FILTRO, TEACHING_LEVEL_ID }`: listado del período.
- Ya no se usan `POST /eval-col/escalas/bulk-delete` ni `/escalas/valoraciones/bulk-delete` (se quitaron los borrados y exportes masivos).
- Validar que las valoraciones de un nivel no se crucen y cubran el rango de la escala.

## 11. Niveles de enseñanza

- Lectura del catálogo de niveles: `grados` (`string[]`) con los nombres de los grados del nivel, para filtrar el selector de grado. Si no viene, se muestran todos.

## 12. Calendario académico (nuevo, Sección 5.8 / Regla 109)

Pestaña nueva del período, antes de Criterios de promoción. Las rutas son **propuesta** (ajustar nombres y avisar).

| Operación | Ruta | Body |
|---|---|---|
| Listar | `GET /eval-col/calendario/:periodId` | — |
| Agregar | `POST /eval-col/calendario` | `FK_PERIODO_ACADEMICO`, `TIPO`, `FECHA_DESDE`, `FECHA_HASTA`, `MOTIVO` |
| Modificar | `PUT /eval-col/calendario/:id` | igual que agregar |
| Eliminar (baja lógica) | `PATCH /eval-col/calendario/:id/eliminar` | — |

- `TIPO`: `VACACIONES` | `SUSPENSION` | `HABIL` (Día hábil por excepción). `FESTIVO` solo en lectura.
- Respuesta del listado: `{ rows: [{ id, tipo, origen, fecha_desde, fecha_hasta, motivo }] }`.
  - Incluye los **festivos** del período (`origen: "FESTIVO"`, id negativo o sin id propio) desde la lista de Administración del Sistema (Sección 6.2), con la fecha de cada año.
  - Las entradas registradas llevan `origen: "REGISTRADO"`.
- Validaciones y mensajes:
  - "Las fechas deben estar dentro del Período Académico."
  - `FECHA_HASTA >= FECHA_DESDE`; Motivo de 5 a 150 caracteres.
  - "Solo se puede marcar como hábil un día que sería inhábil." (todo el rango de `HABIL` debe caer en festivos, vacaciones o suspensiones).
  - "No se puede marcar [fecha] como inhábil: tiene [N] sesiones de asistencia registradas. Anúlelas primero." (**no está en el mock**: necesita los datos de asistencia).
  - Período Cerrado: solo lectura, rechazar escrituras.
- Propagación: cambiar, inactivar o agregar un festivo se propaga solo a los períodos que **aún no han comenzado**.
- Bitácora: cada entrada y cada propagación de un festivo.
- Efectos pendientes en otros módulos (Regla 109): no registrar asistencia en días inhábiles, el Planeador solo ofrece fechas hábiles, intensidad horaria real y semanas lectivas sobre días hábiles, y correr las Ejecuciones de un día que pasa a inhábil a la siguiente clase.
- Resumen "Días hábiles · Semanas lectivas": hoy lo calcula el front (lunes a sábado, semana lectiva = semana con algún día hábil). Si el back lo calcula, conviene devolverlo en el listado para que coincida con asistencia y Planeador.

## 13. Asignaciones académicas (rediseño, Sección 5.4 / Reglas 68, 69, 70 y 108)

La pestaña deja de ser "docente → traspaso de asignaturas" (`/asignaciones/pool`, `/asignaciones/:periodo/docente/:id`, `POST /asignaciones` con `SUBJECT_IDS`) y pasa a un listado de asignaciones: **una fila por Docente + Grupo + [Área]**, con acciones por fila. Rutas **propuestas**:

| Operación | Ruta | Body |
|---|---|---|
| Listar | `GET /eval-col/asignaciones/listar/:periodId` | — |
| Crear (una por grupo) | `POST /eval-col/asignaciones/crear` | `ACADEMIC_PERIOD_ID`, `FK_FUNCIONARIO`, `FK_GRUPOS` (array), `FK_ASIGNATURA` |
| Modificar | `PUT /eval-col/asignaciones/:id` | `FK_FUNCIONARIO`, `FK_GRUPO`, `FK_ASIGNATURA` |
| Inactivar / Activar | `PATCH /eval-col/asignaciones/:id/estado` | `ESTADO`: `"A"` | `"I"` |
| Eliminar (baja lógica) | `PATCH /eval-col/asignaciones/:id/eliminar` | — |

- Respuesta del listado: `{ rows: [{ id, funcionario_id, docente, grado_id, grado, grupo_id, grupo, asignatura_id, asignatura, estado, automatica }] }`. Todas las del período (búsqueda, filtros y paginación en el front).
- **Automáticas (Regla 108):** para los grupos con *Dicta todas* el listado incluye una fila por asignatura del plan para el Responsable de grupo, con `automatica: true`. Son de solo lectura: el back debe rechazar modificarlas, inactivarlas o eliminarlas (se gestionan desde el grupo). Hoy no tienen id propio en el mock (van negativas).
- Crear es **atómico**: si algún grupo falla la validación, no se crea ninguna.
- Validaciones y mensajes:
  - Regla 68: el docente debe tener el rol Docente **activo** en la Sede y Jornada del período, y la asignatura debe estar en el plan de estudio del grado.
  - Regla 69: "[Área] en [Grupo] ya está asignada a [Docente]. Elimine esa asignación para asignarla a otro." Con varios grupos, el mensaje lista los que ya la tienen.
  - Regla 108: "El grupo [Grupo] tiene a [Responsable de grupo] como Responsable de todas las asignaturas del plan. Para asignar a otro Responsable de enseñanza, desmarque la casilla del grupo."
  - Período Cerrado: solo lectura.
- Regla 70: eliminar se permite siempre; lo registrado en Gestión Académica queda sin propietario hasta una nueva asignación del mismo Grupo y [Área]. Inactivar solo restringe el acceso del docente, sin cambiar de propietario.
- El selector de Docente usa `POST /eval-col/asignaciones/docentes/:periodId` y filtra los activos. Ese endpoint devuelve `estado` como `"A"`/`"I"` en el mock y el front esperaba `"ACTIVO"`: el front ahora acepta los dos; confirmar cuál manda el back.
- Exportar (PDF y Excel, Regla 99): debe exportar el listado nuevo con los mismos filtros.

## 14. Generar planes de estudio y horarios (Sección 5.7 / Regla 104)

Menú **Generar** del encabezado del período, con *Planes de estudio* y *Horarios*. Cada opción abre un modal con los grados (y, en horarios, sus grupos) para marcar y arma **un solo PDF**, una hoja por grado o grupo, en el orden de los grados.

| Reporte | Ruta | `filters` |
|---|---|---|
| Planes de estudio | `POST /reportes/periodo-planes-estudio` | `FK_PERIODO`, `FK_GRADOS` (array) |
| Horarios | `POST /reportes/periodo-horarios` | `FK_PERIODO`, `FK_GRUPOS` (array) |

- Mismo contrato que el resto de `/reportes/:clave` (`format: "pdf"`, `filtersLabel` con la identidad del período). Claves **propuestas**.
- Omitir los grados sin plan y los grupos sin horario (el front ya no los manda y avisa: "[N] grupos no tienen horario y no se incluirán.").
- Pendiente: la advertencia *Horario con bloques por corregir* (Regla 74) necesita saber qué grupos tienen bloques afectados; hoy no hay dato para eso.
- Presentación común de los documentos, sin QR, y la generación queda en la Bitácora.
- Con el período *Cerrado* también se puede generar.

---

## Sin cambios de contrato, pero a confirmar

- Las tablas de las pestañas (Períodos de evaluación, Grados, Grupos, Plan de estudio, Escalas, Calendario) piden todas las filas y paginan en el front, porque los avisos (total de pesos, sumas de porcentajes, cobertura de la escala) necesitan el total. Si algún listado puede crecer mucho, avisar para volver a paginar en el back.

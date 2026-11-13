# Matrícula — pendientes del back

El front se construye contra mocks de MSW (`src/mocks/db`, `src/mocks/handlers`). Cada tarea anota la ruta y el contrato que el mock ya cumple, para que el SSO lo implemente igual.

Fuente de reglas: `docs/Matricula.md` y `docs/Matricula_detalle_completo.md` del SSO.

## Pendientes

### 1. Crear snapshots (Sección 4.2 y 4.5)
- **Qué:** al guardar un traslado y al cambiar de grupo, jornada o sede, insertar en `TMATRICULA_SNAPSHOT` y en `TMATRICULA_SNAPSHOT_NOTA_ORIGEN`, con `HOMOLOGADO_AT` vacío. En el cambio de grupo, calcular la nota parcial con el porcentaje cursado del período en curso.
- **Ya existe (V220–V245):** listar, ver origen, corregir, snapshot pendiente y homologar.
- **Por qué bloquea:** sin esto, con el back real la pestaña *Notas homologadas* siempre sale vacía y el modal de homologar nunca aparece.

### 2. Marca de snapshot pendiente en el listado
- **Qué:** agregar un campo booleano, por ejemplo `snapshot_pendiente`, a cada fila del listado de matrícula.
- **Para qué:** mostrar *Homologar desde snapshot* como ícono de la fila solo en las matrículas que tienen un traslado sin homologar.
- **Front con mock:** el listado ya lee `snapshot_pendiente` ("S" | "N") y muestra el ícono; el detalle lee `anulacion_pendiente` ("S" | "N") para bloquear Editar (ver 2b).

### 2b. Restricciones de Editar en el detalle (C.1.EDI)
- Pantalla: Editar matrícula. Deja campos en solo lectura según la documentación.
- Ruta: GET /eval-col/cobertura-academica/matricula/:ID (la existente). Agregar al objeto `matricula`:
  - `tipo_matricula`: "PRINCIPAL" | "COMPLEMENTARIA" → campo *Tipo de matrícula* (bloque 2.1, siempre solo lectura).
  - `tiene_complementaria`: "S" | "N" → *Especialidad* en solo lectura con «Cambie la especialidad desde su matrícula complementaria.» (Sección 2.16).
  - `postulacion_registrada`: "S" | "N" → *Especialidad* en solo lectura con «Cambie la especialidad con Cambiar cupo.» (Sección 2.16.2).
  - `retiro_solicitado_por`: nombre del establecimiento o null → bloquea sede, jornada, grado y grupo con el aviso de la línea 392 (Regla 71). El back también debe rechazar esos cambios.
- Listado (`/matricula/query`): agregar `retiro_solicitado` ("S" | "N") por fila; con "S" la lista oculta los íconos Cambiar de grupo y Cambiar de grado.
- Front: si faltan, toma Principal y sin bloqueos.
- Mock: src/mocks/handlers/matricula.ts (`toRawMatriculaDetail`, variedad por pk: pk%3=0 complementaria, pk%3=1 postulación, pk%5=0 retiro).
- Enmascarado (Regla 43 y Regla 19): lo hace el front sobre los nombres de estudiante y acudiente; si el back debe mandarlos ya enmascarados, cambiar aquí.

### 3. Acciones de la fila sin back (íconos)
| Acción | Regla | Estado |
|---|---|---|
| Responder solicitud de retiro | Sección 2.2, Regla 71 | front con mock (ver 6) |
| Anular matrícula | Sección 2.2, Regla 71 | front con mock (ver 6) |
| Reactivar | Sección 4.4, Regla 15 | front con mock (ver 7) |
| Unificar estudiantes | Sección 2.2, Regla 72 | front con mock (ver 5) |
| Agregar matrícula complementaria (desde la lista) | Sección 2.16 | sin front ni back |
| Generar paquete de soporte | Sección 2.14, Regla 73 | sin front ni back |
| Generar hoja de matrícula | Sección 3.6 | sin front ni back |

Cuando se haga el front de cada una con mock, se anota aquí su ruta y su contrato.

### 4. Filtros de la lista y aviso de solicitudes (C.1.LIS, Sección 2.2)
- Pantalla: panel de filtros de la lista (Metodología y Solicitud de retiro), chips de filtros activos y aviso amarillo fijo sobre la lista con «Ver estudiantes».
- POST /eval-col/matricula/query (existente) y el export: dos claves nuevas en el cuerpo.
  - `METODOLOGIA`: pk_lista_valor de la lista METODOLOGIA, o null.
  - `SOLICITUD`: "CON_SOLICITUD" (retiro solicitado en el origen o anulación pendiente en el destino), o null.
- GET /eval-col/select/METODOLOGIA: catálogo de metodologías (SIMAT). El mock trae Tradicional, Escuela Nueva, Aceleración del aprendizaje, Postprimaria, Telesecundaria y Media rural.
- GET /eval-col/matricula/solicitudes-pendientes → `{ rows: [{ retiros_sin_responder, anulaciones_pendientes }] }`, contados en las Sedes y Jornadas del usuario. Con los dos en 0 el aviso no sale.
- Mock: src/mocks/db/metodologia.ts (una de cada diez matrículas no es Tradicional), filtros en src/mocks/handlers/matricula.ts y el conteo en src/mocks/handlers/solicitud-retiro.ts.

### 5. Unificar estudiantes (Regla 72)
- Pantalla: ícono «Unificar estudiantes» en la fila de la lista (matrícula Cursando); modal con estudiante que se conserva, estudiante duplicado, Motivo y Soporte.
- Ruta 1: GET /eval-col/cobertura-academica/estudiantes/buscar?Q=:texto (documento o nombre, mínimo 3 caracteres; sin los ya unificados; máximo 8)
  - Respuesta: `{ rows: [{ pk_testudiante, tipo_documento, identificacion, nombre, cursando_periodo_id, cursando_periodo, cursando_establecimiento, cursando_grupo }] }` (los `cursando_*` en null si no tiene matrícula Cursando), más `matriculas`, `reservas` (conteos del registro) y `establecimientos` (string[] con matrícula del estudiante) para el resumen y el aviso.
- Ruta 2: POST /files/eval-col/cobertura-academica/estudiantes/unificar (multipart) con CONSERVA, DUPLICADO, MOTIVO (10 a 500) y SOPORTE (1 PDF/JPG/PNG, 10 MB). Alias `AS unificacion`.
  - Respuesta: `{ rows: [{ unificacion: { registrosMovidos } }] }`.
  - Errores (400 con `message`): mismo registro; los dos Cursando en el mismo período («Retire o anule una de las dos antes de unificar.»); motivo o soporte inválidos; ya unificado.
- Qué hace: pasa matrículas, reservas, inscripciones e historial del duplicado al que se conserva; el duplicado queda «Unificado en [documento]» sin acceso a nuevos registros; Bitácora con antes y después; aviso a los establecimientos con matrícula de cualquiera de los dos.
- Quién: Administrador o Gestor administrativo del establecimiento si los dos registros solo tienen matrícula en él; entre establecimientos distintos, el Administrador territorial. El front solo exige permiso de editar MATRICULA.
- Pendiente aparte: la entrada desde el reporte de calidad «Posibles duplicados» (C.4.CAL.5).
- Mock: src/mocks/db/unificar-estudiantes.ts y src/mocks/handlers/unificar-estudiantes.ts (cada 7.ª matrícula tiene un duplicado NES; la de cada 14.ª, Cursando en el mismo período, para el bloqueo).

### 6. Responder solicitud de retiro y Anular matrícula (Sección 2.2, Regla 71)
- Pantalla: lista de matrícula. En el origen la fila muestra el badge «Retiro solicitado» y el ícono Responder solicitud de retiro; en el destino, «Anulación pendiente» y el ícono Anular matrícula. Los dos reemplazan a Retirar y ocultan Cambiar de grupo/grado.
- Listado (`/matricula/query`): `retiro_solicitado` y `anulacion_pendiente` ("S" | "N") por fila.
- GET /eval-col/cobertura-academica/matricula/:ID/solicitud-retiro → `{ rows: [{ solicitud: { pk_tsolicitud_retiro, rol: "ORIGEN"|"DESTINO", establecimiento_solicitante, establecimiento_origen, fecha_solicitud, dias_sin_respuesta, estado, evidencia_nombre, fk_tarchivo_evidencia, motivo_cierre, registros: { asistencias, notas, anotaciones } | null } }] }`. Estados: PENDIENTE, VENCIDA, ATENDIDA, OBJETADA, POR_ANULAR, CERRADA_SIN_RETIRO. 404 si no hay.
- POST /eval-col/cobertura-academica/matricula/:ID/solicitud-retiro/retirar (cuerpo vacío): retira con Motivo de retiro «Traslado a otro establecimiento» y Motivo de la novedad «Requerimiento de otra entidad territorial o establecimiento»; solicitud Atendida; reglas de traslado de Gestión Estudiantil.
- POST /files/eval-col/cobertura-academica/matricula/:ID/solicitud-retiro/objetar (multipart): MOTIVO (10 a 500), EVIDENCIA opcional (PDF/JPG/PNG, 10 MB); solicitud Objetada, queda al Administrador territorial.
- POST /eval-col/cobertura-academica/matricula/:ID/anular con `{ MOTIVO_ANULACION: "DUPLICADA_SOLICITUD_RETIRO" }`: estado Anulado, anula los registros de la matrícula (marcados «Anulado por matrícula duplicada», no se restauran), solicitud Cerrada sin retiro.
- Errores: 400 con `message` si no hay solicitud pendiente o el motivo no cumple.
- Quién: Administrador o Gestor administrativo del establecimiento del origen (responder) o del destino (anular); el front solo pide editar MATRICULA.
- Fuera de este front: crear la solicitud al matricular, avisos diarios y correo, la decisión del Administrador territorial (Registrar retiro / Cerrar sin retiro), el aviso fijo y el filtro «Con solicitud pendiente».
- Detalle: con anulación pendiente también deben bloquearse los cambios académicos; hoy el detalle solo trae `retiro_solicitado_por`.
- Mock: src/mocks/db/solicitud-retiro.ts y src/mocks/handlers/solicitud-retiro.ts (origen: pk % 5 === 0; destino: pk % 11 === 0, solo matrículas Cursando).

### 7. Reactivar (Sección 4.4, Regla 15)
- Pantalla: ícono «Reactivar» en la fila de Promovido, Promovido Anticipadamente, Reubicado, Aprobado o Reprobado; modal *Reactivar matrícula — [Estudiante]* o bloqueo de un solo botón *Entendido*.
- GET /eval-col/cobertura-academica/matricula/:ID/reactivar/previa → `{ rows: [{ previa: { periodo_abierto, promovido_areas_pendientes, tiene_matricula_siguiente, matricula_siguiente: { periodo, grado, grupo, estado } | null, tiene_complementaria, matricula_nueva: { grado, grupo, registros_propios, registros: { actividades, clases } | null } | null } }] }`. `matricula_nueva` solo en Promovida/Reubicada (la creada por el cambio de grado).
- POST /files/eval-col/cobertura-academica/matricula/:ID/reactivar (multipart): MOTIVO (10 a 500), SOPORTE opcional (PDF/JPG/PNG, 10 MB), REGISTROS_NUEVA "HOMOLOGAR" | "DESCARTAR" solo si la nueva tiene registros propios.
- Qué hace: vuelve a Cursando; la nueva pasa a Anulado (homologando de vuelta con snapshot o descartando sus registros); Aprobada/Reprobada reejecuta el cierre del estudiante y reajusta la reserva; la complementaria la sigue; Bitácora.
- Bloqueos (400 con `message`): período cerrado; marca Promovido con áreas pendientes; matrícula en el período siguiente («No se puede reactivar la matrícula porque el estudiante ya tiene matrícula en el período siguiente.»); Anulado/Graduado no se ofrecen.
- Fuera de este front: reactivar en lote las Aprobadas y Reprobadas (Regla 56).
- Mock: src/mocks/db/reactivar.ts y src/mocks/handlers/reactivar.ts (pk par: la nueva con registros; pk % 4 === 0: período siguiente; pk % 6 === 0 en Aprobado: áreas pendientes; pk % 9 === 0: período cerrado).

### 8. Formulario por bloques 2.1 a 2.15 (C.1.AGR)
- Campos nuevos que el front ya captura con mock. Solo viajan con el mock (`camposNuevosBody` en `to-create-matricula-body.ts`) porque el validador de placeholders rechaza claves no declaradas; al implementarlos, quitar esa condición. Mismas claves en POST (alta) y PATCH (editar), y en el detalle `GET /matricula/:ID` dentro de `matricula`:
  | Bloque | Campo | Clave del cuerpo | Clave en el detalle | Lista de valores |
  |---|---|---|---|---|
  | 2.1 | Internado | INTERNADO | fk_tlv_internado | INTERNADO (No, Semi interno, Residente) |
  | 2.2 | País de origen | PAIS_ORIGEN | fk_tlv_pais_origen | PAIS |
  | 2.2 | Lengua materna | LENGUA_MATERNA | fk_tlv_lengua_materna | LENGUA_MATERNA |
  | 2.2 | Condición migratoria | CONDICION_MIGRATORIA | fk_tlv_condicion_migratoria | CONDICION_MIGRATORIA |
  | 2.8 | Apoyo académico especial | APOYO_ACADEMICO_ESPECIAL | fk_tlv_apoyo_academico | APOYO_ACADEMICO_ESPECIAL |
  | 2.8 | Trastorno específico | TRASTORNO_ESPECIFICO | fk_tlv_trastorno | TRASTORNO_ESPECIFICO |
  | 2.8 | Situación en el SRPA (sensible, Regla 77) | SITUACION_SRPA | fk_tlv_srpa | SITUACION_SRPA |
  | 2.8 | Fechas de la medida | FECHA_INICIO_MEDIDA, FECHA_FIN_MEDIDA | fecha_inicio_medida, fecha_fin_medida | — |
- Listas nuevas por `GET /eval-col/select/:CATEGORIA`: INTERNADO, PAIS, LENGUA_MATERNA, CONDICION_MIGRATORIA, APOYO_ACADEMICO_ESPECIAL, TRASTORNO_ESPECIFICO, SITUACION_SRPA e INSTITUCION_BIENESTAR (2.5, ahora selector: `INSTITUCION_BIENESTAR_DE_ORIGEN` ya existía como BIGINT).
- 2.1 Periodo (modalidad y ciclo): el front elige el período abierto de la sede y jornada y lo usa para el grado; el back debe aceptar el período elegido en vez de resolver siempre el vigente.
- 2.14 Hoja de matrícula firmada: POST /files/eval-col/cobertura-academica/matricula/:ID/hoja-firmada (multipart, ARCHIVO, 10 MB). El detalle debe listarla en `archivos` con `tipo_archivo_nombre` que contenga «Hoja».
- 2.14 tamaño máximo: 10 MB (antes 25). 2.14 y 2.15 ya no se muestran al agregar (Regla 23): el alta no sube soportes; al guardar se va a Editar.
- Validaciones que el back también debe aplicar:
  - Documento: 5 a 20; solo dígitos, salvo tipos de extranjero (PPT, PEP, pasaporte, NES), alfanumérico. Con País de origen Colombia no se admite documento de extranjero; con documento de extranjero el país es obligatorio.
  - Nombres y apellidos: 2 a 50 (hay estudiantes con nombres de 2 letras; el doc dice 3), letras, espacios, apóstrofo y guion.
  - Teléfonos: 7 a 15 dígitos con «+» opcional. Correos: hasta 254.
  - Dirección mínimo 8; barrio 5 a 100; EPS y ARS 2 a 100; «¿Cuál?» 3 a 100 y obligatorio si viene de otro municipio; entidad del acudiente hasta 150.
  - Fecha de nacimiento: no futura ni de más de 80 años. Fecha de inicio de la medida obligatoria si el SRPA no es «No aplica»; fin ≥ inicio.
  - Último municipio expulsor: solo y obligatorio si es población víctima.
  - Siempre obligatorios: madre cabeza de familia, Héroes de la nación, nombre, primer apellido, documento y género del acudiente, correo del acudiente, y correo del estudiante en Básica secundaria y Media. En el front van `locked` en el catálogo de config.
- Regla 4: el front muestra un solo selector de municipio (el departamento sale del municipio); el back sigue recibiendo solo el municipio.
- No hecho en el front: Foto del estudiante dentro de 2.2 (sigue como soporte en 2.14, sin validar píxeles); el selector Año aparece como dato de solo lectura del período; ocultar SRPA a los demás roles; limitar «Institución de bienestar» a nuevos de Preescolar y Primero.

### 9. Estudiante existente en el alta (Reglas 3, 7 y 8)
- Pantalla: Agregar estudiante. Al digitar el documento (bloque 2.2, ya va antes que los nombres) se busca el estudiante; si existe, aparece una tarjeta de verificación y su identidad (nombres, fecha de nacimiento, género, lugares, etnia, país) queda en solo lectura. El documento sigue editable.
- GET /eval-col/cobertura-academica/matricula/estudiante-existente?DOCUMENTO=:numero (por número, sin importar el tipo; mínimo 5 caracteres) → `{ rows: [{ primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, fecha_nacimiento, correo_enmascarado, telefono_enmascarado, ultimo_acudiente_parentesco, ultimo_acudiente_nombre }] }`; sin filas si no existe.
- El correo y el teléfono llegan ya enmascarados del back (Guía UX §5), no se mandan completos al front.
- Pendiente en el front y el back: precargar el acudiente de la última matrícula (bloques 2.10 a 2.13) y los datos que cambian de un año a otro (2.3 a 2.9) del estudiante existente; hoy solo se precargan los de identidad. Validaciones de Regla 7 (misma matrícula en grado y período) siguen en `/coverage/matricula/check`.
- Mock: src/mocks/handlers/estudiante-existente.ts (busca el número en las matrículas del mock).

### 10. Acciones de fila y por lote (C.1.LOT.1–8)
- Pantalla: barra que aparece al seleccionar filas en la lista (Retirar, Reingresar, Reactivar, Cambiar de grupo, Corregir grado, Generar constancias, Generar hojas de matrícula, Exportar). Regla 56: solo se habilitan las acciones que sirven para **todas** las filas marcadas. Los mismos modales se abren desde la fila y el detalle con una sola matrícula (ahí además: cambiar de grado completo, hoja, constancia y paquete de soporte). Reemplaza la Edición masiva (`dialog-modificar-matricula.tsx`, eliminado) y los PUT `{id}/retirar|reingresar` del front.
- Roles: Reactivar y Corregir grado son solo del Administrador del establecimiento o el Gestor administrativo; el front no los filtra (no hay código de rol claro), el back debe rechazarlo. Cada acción deja un registro por estudiante en la Bitácora.
- Cada acción recibe `IDS` (pk de matrícula) y responde **una fila por matrícula**: `{ rows: [{ pk_matricula, ok, mensaje }] }`. El lote no se detiene si una falla; `mensaje` es para el usuario.
- Retirar: POST /eval-col/cobertura-academica/matricula/lote/retirar/previa `{ IDS }` → `{ rows: [{ pk_matricula, complementaria: { sede, jornada, especialidad } | null }] }`. POST .../lote/retirar `{ IDS, FECHA_RETIRO (yyyy-MM-dd, no futura), FK_TLV_MOTIVO_RETIRO, MOTIVO_NOVEDAD, OBSERVACION | null }`. La complementaria pasa a Retirado con la principal. Catálogo nuevo `MOTIVO_RETIRO` en `/select/:CATEGORIA`.
- Reingresar: POST .../lote/reingresar/previa `{ IDS }` → `{ rows: [{ pk_matricula, fecha_retiro, grupo_actual, sin_cupo, cupos_libres, periodo_abierto, grupos_con_cupo: [{ pk_grupo, codigo, ocupados, capacidad }], periodos_durante_retiro: ["P2"], caso_reintegracion: "Reingreso aprobado" | null, complementaria_sin_cupo: "Electricidad" | null }] }`. POST .../lote/reingresar `{ FECHA_REINGRESO (entre el retiro y hoy), OBSERVACION, MATRICULAS: [{ ID, FK_TGRUPO | null }] }`; `FK_TGRUPO` solo si su grupo ya no tiene cupo (las notas se homologan como en un cambio de grupo). Los períodos transcurridos quedan Pendiente por nivelación. Individual: sin cupo en la complementaria → bloqueo; con su grupo sin cupo se elige otro. Lote: solo período Abierto, sin elegir grupo; si las marcadas de un grupo superan `cupos_libres` el front muestra «El grupo [Grupo] tiene [N] cupos y seleccionó [M] estudiantes…» y no deja reingresar; la complementaria sin cupo o con convenio finalizado no bloquea (la principal reingresa y se avisa por fila).
- Grupos destino: GET .../lote/grupos-destino?FK_SEDE=&JORNADA=&GRADO=[&FK_PERIODO=] → `{ rows: [{ pk_grupo, codigo, ocupados, capacidad }] }`, solo con cupo.
- Emparejamiento: POST .../lote/emparejamiento `{ IDS, FK_TGRUPO, FK_PERIODO | null }` → `{ rows: [{ emparejamiento: { tipo, mismo_plan, periodos: [{ origen, en_curso (% o null), opciones, destino }], asignaturas: [{ origen | null, destino | null, opciones, estado: EMPAREJADA | PENDIENTE_NIVELACION | SOLO_HISTORIAL }], escala_distinta } }] }`.
- Cambiar de grupo: POST .../lote/complementarias `{ IDS }` (misma forma que la previa de retiro; avisa si la jornada destino es la de la complementaria). POST .../lote/cambiar-grupo `{ IDS, FK_TGRUPO, EMPAREJAMIENTO: { PERIODOS: [{ ORIGEN, DESTINO }], ASIGNATURAS: [...] } | null }` (null con el mismo plan). Lote: mismo grado, sede, jornada y período; solo Grupo destino con cupo para todas y `EMPAREJAMIENTO` null. Cambiar de sede o jornada es individual.
- Cambiar de grado: POST .../lote/cambiar-grado/previa `{ IDS }` → `{ rows: [{ previa: { periodos: [{ pk_periodo, label, fk_sede, jornada }], grados: [{ valor, nombre }], grado_siguiente, registros: { actividades, definitivas: ["P1"], clases } | null, con_registros, complementaria: { sede, jornada, especialidad, disponible_en_grado_siguiente } | null } }] }` (`con_registros`: cuántas de la selección tienen registros). POST multipart /files/eval-col/cobertura-academica/matricula/lote/cambiar-grado: `IDS` (JSON), `TIPO` PROMOCION | REUBICACION | CORRECCION, `FK_PERIODO`, `FK_TGRUPO`, `MOTIVO` (10–500), `REGISTROS` HOMOLOGAR | DESCARTAR (solo corrección con registros), `EMPAREJAMIENTO` (JSON; en corrección solo si se homologa), archivo `ACTA` (obligatorio salvo corrección; PDF/JPG/PNG, 10 MB). Promoción solo al grado siguiente; promoción y reubicación crean matrícula nueva Cursando y dejan la actual Promovido / Reubicado; corrección cambia el grado de la misma matrícula. En lote solo va `TIPO` CORRECCION (acta opcional, una decisión y un emparejamiento para todas, grupo con cupo para todas); la complementaria se resuelve después una por una.
- Reactivar por lote: POST multipart /files/eval-col/cobertura-academica/matricula/lote/reactivar: `IDS` (JSON), `MOTIVO`, archivo `SOPORTE` opcional. Solo Aprobadas (sin Promovido con áreas pendientes) o Reprobadas, período Abierto y sin matrícula en el período siguiente; su complementaria también vuelve a Cursando. Las Promovidas y Reubicadas van una por una. Con una sola matrícula el front usa la previa y el modal de la tarea 7.
- Generar constancias de estudio (Sección 2.17, Regla 58): GET .../lote/constancias/configuracion → `{ rows: [{ numeracion }] }`. POST .../lote/constancias `{ IDS, DIRIGIDA_A (3–150, por defecto «A quien interese»), BORRADOR: "S" | "N" }` → un PDF con una constancia por estudiante; solo Cursando. Borrador: sin número, marca BORRADOR, sin QR. Se registra como documento emitido (QR) y en la Bitácora con su Dirigida a.
- Generar hoja(s) de matrícula (Sección 3.6): POST .../lote/hojas `{ IDS }` → un PDF con la hoja de cada estudiante; solo Cursando. Individual con un solo id.
- Paquete de soporte (Regla 73, individual): GET /eval-col/cobertura-academica/matricula/:id/paquete-soporte/previa → `{ rows: [{ documento_identidad: bool, boletin: "Boletín del período P1" | null, hoja_firmada: bool }] }` (en Preescolar el boletín es el informe formativo del último período cerrado, o el del año en curso, o el certificado del año anterior). POST .../:id/paquete-soporte → un PDF; lo que falte se indica dentro y no bloquea.
- Mock: src/mocks/db/acciones-lote.ts, src/mocks/handlers/acciones-lote.ts (registrado antes de las rutas con `:id`).

## Formato para nuevas tareas

```
### N. Nombre
- Pantalla: dónde se usa en el front
- Ruta: MÉTODO /eval-col/...  (alias del resultado: AS xxx)
- Cuerpo / parámetros: ...
- Respuesta que espera el front: { ... }
- Errores: código → mensaje que muestra el front
- Mock: src/mocks/db/<archivo>.ts, src/mocks/handlers/<archivo>.ts
- Regla del doc: Sección / Regla
```

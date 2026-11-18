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
- Enmascarado: nombres, apellidos, documento y fecha de nacimiento del estudiante y del acudiente se ven completos (Reglas 8 y 19). El enmascarado de los demás datos sin autorización o por adscripción está en la tarea 16.

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
- Generar carné(s) estudiantil(es) (Sección 2.18, Regla 61), desde la fila, el detalle y la barra de lote; solo Cursando: POST /eval-col/cobertura-academica/matricula/lote/carnes/previa `{ IDS }` → `{ rows: [{ sin_foto }] }` (cuántas no tienen foto; el front avisa que su carné saldrá con una silueta). El PDF sale de reporting-service: `downloadReport("matricula-carne", { format: "pdf", filters: { IDS } })`, tamaño tarjeta 8,6 × 5,4 cm con frente y reverso, varios por hoja carta con marcas de corte, sobre el modelo de Configuración de Reportes. Frente: escudo y nombre del establecimiento, foto o silueta, nombres, documento, grado y grupo, jornada, sede y Vigencia [año]. Reverso: texto ajustable, EPS si está registrada, dirección y teléfono del establecimiento y QR. Vigencia hasta el fin del Período Académico; se registra como documento emitido (la verificación dice Carné vigente o El estudiante ya no tiene matrícula vigente); generar otro deja el anterior Reemplazado; Bitácora con quien lo generó.
- Paquete de soporte (Regla 73, individual): GET /eval-col/cobertura-academica/matricula/:id/paquete-soporte/previa → `{ rows: [{ documento_identidad: bool, boletin: "Boletín del período P1" | null, hoja_firmada: bool }] }` (en Preescolar el boletín es el informe formativo del último período cerrado, o el del año en curso, o el certificado del año anterior). POST .../:id/paquete-soporte → un PDF; lo que falte se indica dentro y no bloquea.
- Mock: src/mocks/db/acciones-lote.ts, src/mocks/handlers/acciones-lote.ts (registrado antes de las rutas con `:id`).
- **Cambio de ruta pedido por el back (fase 7):** query-service no devuelve PDF. Constancias y hojas salen de reporting-service: `downloadReport("matricula-constancia", { format: "pdf", filters: { IDS, DIRIGIDA_A, BORRADOR } })` y `downloadReport("matricula-hoja", { format: "pdf", filters: { IDS } })` en lugar de `descargarPdf` a `/eval-col/.../lote/constancias` y `.../lote/hojas` (agregar las dos claves a `ReportKey`). La configuración de la constancia y la previa del paquete siguen en `/eval-col`. El PDF del paquete aún no existe.

### 11. Matrícula complementaria del estudiante propio (Sección 2.16, Regla 41, C.1.COM.1)
- Pantalla: botón «Agregar matrícula complementaria» en la fila de la lista y modal `dialog-agregar-complementaria.tsx`. Badges en la lista: «Con matrícula complementaria» en la principal, «Complementaria» o «Complementaria de [Establecimiento de origen]» en la complementaria; el mismo badge en el título de Editar.
- Listado (`/eval-col/matricula/query`): agregar por fila `tipo_matricula` PRINCIPAL | COMPLEMENTARIA, `tiene_complementaria` S | N, `origen_adscripcion` (nombre del establecimiento de origen, solo por adscripción) y `puede_agregar_complementaria` S | N: principal Cursando, sin complementaria, sin retiro solicitado y con alguna sede del establecimiento que ofrezca su grado y especialidad en otra jornada con el período Abierto y antes de su Fecha límite de matrícula (Regla 10). El filtro `TIPO` ya viaja en el body.
- Previa: GET /eval-col/cobertura-academica/matricula/:id/complementaria/previa → `{ rows: [{ establecimiento, especialidad, sedes: [{ id, nombre, periodos: [{ id, label ("2027 · Mañana · Anual · Ciclo 1"), jornada, comprometidos, grupos: [{ id, codigo, cupo, libres }] }] }] }] }`. Sedes que ofrecen el grado y la especialidad de la principal; períodos del mismo año, jornada distinta, Abiertos; grupos del mismo grado cuyo horario incluye áreas de la especialidad (Regla 80) y con cupo (Regla 2). `libres` ya descuenta los puestos comprometidos con la convocatoria (su Cupo menos los adscritos matriculados); `comprometidos` se muestra como ayuda. 409 con mensaje si ya tiene complementaria o ninguna sede la ofrece.
- Guardar: POST /eval-col/cobertura-academica/matricula/:id/complementaria `{ FK_TSEDE, FK_TPERIODO_ACADEMICO, FK_TGRUPO }` → `{ rows: [{ pk_matricula }] }`. Crea la matrícula Cursando tipo Complementaria ligada a la principal (una sola por principal), mismo grado, especialidad de la principal; las áreas se gestionan después en su bloque 2.15 y solo pueden ser de la especialidad. Rol: Administrador, Gestor administrativo o Supervisor de sede con Guardar en la Sede y Jornada de la complementaria (el front solo mira el permiso Editar de MATRICULA). 409 si el grupo se quedó sin cupo.
- Reingreso (Regla 12): `complementaria_sin_cupo` bloquea solo el reingreso de una fila Complementaria. En una principal solo avisa que su complementaria no se reactiva. Editar una fila Complementaria deja la especialidad en solo lectura: se cambia con Cambiar de especialidad.
- Ya en el front (tarea 10): la complementaria se retira con la principal y el aviso sale en Retirar; reingreso de la complementaria sin cupo bloquea (`complementaria_sin_cupo`); cambio de grupo a la jornada de la complementaria avisa; cambio de grado avisa que tiene complementaria y que se resuelve después (doc, Corregir grado); `previa.complementaria.disponible_en_grado_siguiente` ya no se usa. Editar deja la especialidad en solo lectura con complementaria (`restricciones.tieneComplementaria`).
- Solo back: retirar la complementaria deja la principal Cursando y avisa (plataforma y correo) al Administrador y al Gestor del establecimiento de la principal; cierre propio de la complementaria (Aprobado o Reprobado, Regla 14) y espera de la principal si el establecimiento exige aprobarla; notas finales de sus áreas en el boletín de la principal como «Áreas de la matrícula complementaria»; cierre de la principal espera esas notas («Pendiente de notas de adscripción»); el año siguiente no pasa por la reserva: se agrega de nuevo con prioridad cuando la principal nueva está Cursando.
- Adscripción (C.2.POS.5, otra tarjeta): el mismo modal, con Sede, Período y Especialidad fijos desde la opción Registrado y la autorización de datos en solo lectura.
- Mock (tarea 11): src/mocks/db/complementaria.ts (variedad por pk: principal con complementaria pk % 3 === 0; fila complementaria pk % 13 === 0 sin ser múltiplo de 3, por adscripción si es par; sin sede que la ofrezca pk % 4 === 2), handlers en src/mocks/handlers/acciones-lote.ts.

### 12. Matrícula complementaria: Convocatorias (Sección 2.16.2, Reglas 52, 53 y 80)
- Pantalla: módulo aparte `/app/cobertura/matricula-complementaria` con pestañas Convocatorias, Postulaciones, Convenios de adscripción y Continuidad (por ahora solo Convocatorias). Menú nuevo en TMENU con código `MATRICULA_COMPLEMENTARIA` (el front lee crear/editar/eliminar de `permisos-menu` con ese código). Roles: Editar, Seleccionar, Ver resultado y Eliminar son del Administrador del establecimiento o el Gestor administrativo; el back debe rechazar a los demás.
- Base: /eval-col/cobertura-academica/matricula-complementaria/convocatorias. Todas las respuestas en `{ rows }`, campos en snake_case (el front los pasa a camelCase).
- Fila de convocatoria (lista, detalle): `{ id, anio, establecimiento, origenes: [{ id, nombre }], forma: ABIERTA | ORIGEN, continuidad_automatica, lista_espera, modo: MANUAL | AUTOMATICA, desempate: SORTEO | ORDEN, inicio_postulacion, cierre_postulacion, publicacion | null, limite_matricula (yyyy-MM-dd), estado: PROGRAMADA | EN_POSTULACION | EN_SELECCION | PUBLICADA | CERRADA (deducido de las fechas; con la forma por el origen y sin lista de espera no hay En selección), cupos: [{ id, sede_id, sede, periodo_id, periodo ("Tarde · Anual · Ciclo 1"), jornada, grado_id, grado, especialidad_id, especialidad, cupo, seleccionados (Registrados + Adscritos), en_lista_espera }], tiene_postulaciones, ejecutada_el | null }`.
- Lista: POST .../query `{ PAGE_INDEX, PAGE_SIZE, SORTING: { ID, DESC } }` → filas con `total_count`. Detalle: GET .../:id.
- Opciones del formulario: GET .../opciones?ANIO= → `{ rows: [{ establecimiento, origenes: [{ id, nombre }] (convenio Aceptado del año, sin el propio), sedes: [{ id, nombre, periodos: [{ id, label, jornada, anual, limite_matricula, grados: [{ id, nombre, inicial (grado inicial de la especialidad en el convenio), especialidades: [{ id, nombre, libres }] }] }] }], continuan: [{ especialidad, grado, cantidad }] }] }`. Solo períodos Abiertos del año en convenio Aceptado con algún origen; grados y especialidades del plan de estudio incluidos en algún convenio; especialidades con un grupo que las dicte. `libres` = puestos libres de los grupos que la dictan (cupo menos matriculados, incluidas las complementarias propias, menos lo reservado para continuidad); es el tope del Cupo y la suma de cupos que comparten grupo no lo supera (Regla 80). `continuan`: adscritos del año anterior que continúan (aviso al fijar el cupo).
- Crear: POST .../ y editar: PUT .../:id `{ ANIO, ORIGENES: [ids], FORMA_POSTULACION, CONTINUIDAD_AUTOMATICA "S"|"N", LISTA_ESPERA "S"|"N", MODO_SELECCION, DESEMPATE, FECHA_INICIO_POSTULACION, FECHA_CIERRE_POSTULACION, FECHA_PUBLICACION | null, FECHA_LIMITE_MATRICULA, CUPOS: [{ ID | null, FK_TPERIODO_ACADEMICO, FK_TGRADO, FK_ESPECIALIDAD, CUPO }] }` → `{ rows: [{ pk_convocatoria }] }`. Validaciones: una por establecimiento y año (409); sin combinación repetida de Período, Grado y Especialidad; inicio ≥ hoy (al crear), cierre ≥ inicio, publicación ≥ cierre (solo Abierta, o por el origen con lista de espera), límite ≥ publicación (o cierre) y ≤ la menor Fecha límite de matrícula de los períodos; continuidad solo si todos los períodos son Anual; modo y desempate solo con Abierta; con la forma por el origen y continuidad, solo el grado inicial. Cambios: desde el cierre no cambian modo, desempate ni continuidad, ni se quitan orígenes; el Cupo sube hasta los libres o baja hasta sus seleccionados; las fechas que ya pasaron no se cambian; forma y lista de espera fijas desde la primera postulación. El front ya aplica todo esto, pero el back debe validarlo.
- Eliminar: PUT .../:id/eliminar; 409 si tiene alguna postulación (aunque esté Anulada). La Bitácora guarda una copia completa.
- Seleccionar (Modo Manual de la forma Abierta en En selección, o lista de espera en Publicada): GET .../:id/seleccion?FK_CUPO= → `{ rows: [{ cupo: {…fila de cupo}, postuladas, convenios: [{ origen, adscritos, maximo }], opciones: [{ id, posicion, postulacion, estudiante, origen, sorteo | null, registro (yyyy-MM-ddTHH:mm), continuidad, estado }] }] }` con las opciones Inscrito (En selección) o En lista de espera (Publicada) en el orden de selección: Continuidad primero y luego el Desempate (con la forma por el origen, la fecha y hora de registro). POST .../:id/seleccionar `{ FK_CUPO }` → `{ rows: [{ registrados, en_lista_espera }] }`: sigue el orden sin saltar una opción con lugar y sin pasar el Cupo máximo de adscritos de cada convenio; las demás quedan En lista de espera. En Publicada notifica cada selección en el momento.
- Ver resultado (Abierta y Automática, desde el cierre): GET .../:id/resultado → `{ rows: [{ ejecutada_el, postulaciones, cupos: [{ cupo ("IE Central · Tarde · Décimo · Sistemas"), postulaciones, registrados, continuidad, en_lista_espera, descartadas, libres }] }] }`.
- Lista del sorteo (Abierta con Sorteo, desde el cierre): GET .../:id/sorteo?FK_CUPO= → `{ rows: [{ ejecutada_el, filas: [{ posicion, postulacion, sorteo, estado }] }] }`, sin datos personales. POST .../:id/sorteo/descargar `{ FK_CUPO, FORMATO: PDF | EXCEL }` → el archivo. El sorteo corre una vez en la Fecha de cierre y su semilla va a la Bitácora.
- Pendiente de otras tarjetas: Postulaciones (la acción Ver postulaciones ya navega a `?tab=postulaciones&convocatoria=:id`), Convenios de adscripción, Continuidad, y el proceso automático y la publicación del lado del back.
- Back (8c):
  - La descarga del sorteo usa `downloadReport('matricula-complementaria-sorteo', { format, filters: { CONVOCATORIA, CUPO } })`, como los demás reportes. No existe `POST .../:id/sorteo/descargar`.
  - `FK_ESPECIALIDAD` de cada cupo es el `id` de la especialidad que dan las opciones.
  - `continuan` sale vacío hasta Continuidad.
  - En la lista, `SORTING.ID` admite `anio` (por defecto), `inicio_postulacion`, `cierre_postulacion` y `estado`.
- Mock: src/mocks/db/convocatorias.ts (2027 En selección Manual con Sorteo; 2025 Cerrada Automática), src/mocks/handlers/convocatorias.ts; menú mock id 70 en src/mocks/db/navigation.ts.

### 13. Matrícula complementaria: Postulaciones (Sección 2.16.2, Reglas 8, 52, 53 y 80)
- Pantalla: pestaña Postulaciones del módulo, más las páginas Nueva postulación, Cambiar cupo (forma Abierta) y Ver detalle. La lista muestra a la vez las postulaciones del origen (matrícula principal en un establecimiento del usuario) y las que recibe (convocatoria de un establecimiento del usuario). Cada fila trae `es_origen` y `es_receptor`, y con ellos el front decide el menú ⁞ (`accionesPostulacion` en `api/postulaciones.ts`):
  - Origen: Cambiar cupo y Anular.
  - Quien recibe: Agregar matrícula complementaria y Liberar cupo.
  - El back valida el rol y la Sede/Jornada con Guardar.
- Base: /eval-col/cobertura-academica/matricula-complementaria/postulaciones; respuestas en `{ rows }`, snake_case.
- Fila: `{ id, numero, estudiante, documento ("TI 1101234567"), matricula_principal_id, principal ("IE Sur · Mañana · 10°A"), jornada_principal, grado_principal, origen, es_origen, es_receptor, convocatoria_id, convocatoria_anio, forma, lista_espera, estado_convocatoria, cierre_postulacion, limite_matricula, receptor_id, receptor, cupo_id, sede, jornada, grado, especialidad_id, especialidad, estado_opcion, estado (INSCRITO | EN_LISTA_ESPERA | REGISTRADO | ADSCRITO | NO_SELECCIONADA | DESCARTADA | RETIRADA | ANULADA), posicion (en lista de espera) | null, sorteo | null, motivo_descarte | null, motivo_anulacion | null, autorizacion, registro (yyyy-MM-ddTHH:mm), matricula_complementaria_id | null }`. Para quien recibe, los datos del estudiante van protegidos (Regla 8).
- Lista: POST .../query `{ SEARCH (número, nombre o documento), FK_CONVOCATORIA, GRADO (de la principal), PAGE_INDEX, PAGE_SIZE }` → filas con `total_count`. Detalle: GET .../:id.
- Matrículas postulables: GET .../principales?Q= → `{ rows: [{ id, label ("Nombre · TI doc · 10°B · Mañana") }] }`. Son las principales Cursando del origen, sin complementaria y sin postulación vigente (una por año; la Retirada cuenta).
- Opciones: GET .../opciones?FK_MATRICULA= → `{ rows: [{ especialidad_principal_id | null, convocatorias: [{ id, receptor_id, receptor, forma, lista_espera, cierre_postulacion, limite_matricula, especialidades: [{ id, nombre, ficha: { descripcion, actividades } }], cupos: [{ id, label, especialidad_id, cupo, disponibles, en_espera }] }] }] }`.
  - Convocatorias: las que están En postulación y tienen al origen de la principal.
  - Cupos: los del grado de la principal en otra jornada; con continuidad automática, solo el grado inicial. Siempre del convenio Aceptado.
  - `disponibles`: cupo menos seleccionados, sin pasar los grupos ni el Cupo máximo de adscritos.
- Postular: POST .../ `{ FK_MATRICULA, FK_CUPO, AUTORIZACION "S"|"N", LISTA_ESPERA "S"|"N" }` → `{ rows: [{ pk_postulacion, numero, estado }] }`.
  - Abierta: queda Inscrito.
  - Por el origen: nace Registrado y ocupa el cupo.
  - Sin cupo (o con alguien ya en la lista) y con lista de espera: entra a la lista solo si `LISTA_ESPERA` es "S". El front lo pregunta antes, con «El cupo se agotó»; si no, responde 409 «No hay cupo libre en [Especialidad].».
  - 409 si ya hay una postulación vigente.
  - Avisa al acudiente (por el origen: «Debe presentarse en … antes del …»).
- Cambiar cupo: PUT .../:id/cupo `{ FK_CUPO, LISTA_ESPERA }` → `{ rows: [{ estado, posicion }] }`.
  - Abierta: solo Inscrito o En lista de espera, con la convocatoria En postulación; conserva su número de sorteo.
  - Por el origen, opción Registrado: en un solo paso y solo si el nuevo cupo tiene disponibles; si no los tiene, 409 y conserva el anterior.
  - Por el origen, En lista de espera: queda Registrado si hay cupo, o entra al final de la otra lista con la fecha del cambio.
- Anular: PUT .../:id/anular `{ FK_TLV_MOTIVO_ANULACION }`, catálogo nuevo `MOTIVO_ANULACION_POSTULACION`. Aplica a Inscrito, En lista de espera o Registrado. La opción queda Descartada y libera su cupo; con lista de espera antes del cierre, el primero pasa solo a Registrado.
- Liberar cupo (por el origen, Registrado, antes de la fecha límite): PUT .../:id/liberar `{ MOTIVO | null }` (máximo 500). La opción queda Descartada con motivo «No se presentó» y se avisa al origen.
- Agregar matrícula complementaria por adscripción (C.2.POS.5):
  - Previa: GET .../:id/matricula/previa → `{ rows: [{ sede, periodo, grado, especialidad, grupos: [{ id, codigo, cupo, libres }] }] }`, solo grupos que dictan la especialidad y tienen cupo.
  - Guardar: POST .../:id/matricula `{ FK_TGRUPO }` → `{ rows: [{ pk_matricula }] }`. La opción pasa a Adscrito y la principal toma la especialidad vinculada (Regla 115).
- Cambiar de especialidad una complementaria (Sección 2.16, Regla 80). Solo desde la fila Complementaria de la vista Matrícula, nunca desde la principal ni desde Postulaciones.
  - Previa: GET /eval-col/cobertura-academica/matricula/:id/complementaria/especialidad/previa → `{ rows: [{ actual ("Sistemas · IE Central · Tarde · Décimo · 10°T1"), especialidad_actual, origen (por adscripción) | null, especialidades: [{ id, nombre, grupos: [{ id, codigo, cupo, libres }] }] }] }`.
  - Guardar: PUT .../:id/complementaria/especialidad `{ FK_ESPECIALIDAD, FK_TGRUPO }`. Solo hasta la Fecha límite de matrícula y sin resultados en la anterior: 409 «No se puede cambiar: ya tiene resultados registrados en [Especialidad].».
  - La principal toma la nueva y el cupo anterior queda libre. Avisa al acudiente y al estudiante, y por adscripción también al origen.
- Revisión contra el doc:
  - Agregar matrícula complementaria con la forma Abierta solo desde la publicación de resultados (`estado_convocatoria` PUBLICADA). Con la forma por el origen, desde que la opción queda Registrado.
  - Autorización de tratamiento de datos opcional (Regla 81, tabla de campos de la postulación): casilla sin marcar; «permite que el establecimiento consulte la información ya registrada; sin ella el proceso continúa». No frena ni descarta la postulación; ya no hay estado *Autorización pendiente* ni motivo *Sin autorización de datos*. El portal (otra tarjeta) no tiene casilla: muestra el aviso de la Política de tratamiento de datos.
  - Cambiar cupo de una opción Registrado (por el origen) solo con la convocatoria En postulación: en la fecha de cierre ya no hay cambios.
  - En Cambiar cupo el establecimiento que recibe queda fijo.
- Back (8d):
  - `estado` y `estado_opcion` salen iguales, porque una postulación tiene una sola opción.
  - El número tiene la forma `MC2026-00001`.
  - Anular deja la postulación en ANULADA.
  - El filtro `GRADO` acepta el código o el nombre del grado.
  - `especialidades[].ficha` sale `{ descripcion: null, actividades: [] }` porque todavía no tiene fuente.
  - En Cambiar de especialidad, `FK_ESPECIALIDAD` es el `id` de `especialidades` de la previa.
  - Los avisos todavía no salen.
- Pendiente de la otra tarjeta: el portal del acudiente y del estudiante (postular, autorización pendiente, resultados).
- Mock:
  - Archivos: src/mocks/db/postulaciones.ts y src/mocks/handlers/postulaciones.ts.
  - El usuario trabaja en IE Central y en ITI. ITI usa la forma por el origen con lista de espera; ITC, Abierta.
  - Cambiar de especialidad falla con matrícula de pk múltiplo de 5, para ver el bloqueo.
  - No está ligado a los datos de Seleccionar de la tarea 12.

### 14. Matrícula complementaria: Convenios de adscripción (Sección 2.16.1, Reglas 42, 114 y 115)
- Pantalla: pestaña Convenios de adscripción del módulo.
  - Muestra los convenios que el establecimiento del usuario recibe (badge «Envía a sus estudiantes») y los que envía («Recibe a mis estudiantes»).
  - Filtros: búsqueda por establecimiento y Año.
  - Menú ⁞ (`accionesConvenio` en `api/convenios.ts`):
    - Ver detalle.
    - Aceptar y Rechazar: el origen, sobre un convenio Propuesto.
    - Renovar convenio: el que recibe, sobre uno Aceptado o Finalizado.
    - Finalizar: cualquiera de las partes sobre uno Aceptado; si está Propuesto, solo el que recibe.
  - Roles: el Administrador del establecimiento o el Gestor administrativo; los valida el back.
- Base: /eval-col/cobertura-academica/matricula-complementaria/convenios; respuestas en `{ rows }`, snake_case.
- Fila: `{ id, contraparte (el otro establecimiento), soy_receptor, receptor, origen, anio, periodos: [{ id, nombre }], grados: [nombres], especialidades: [nombres], cupo_maximo | null (sin límite), adscritos (matriculados), estado: PROPUESTO | ACEPTADO | RECHAZADO | FINALIZADO, documentos: [nombres], motivo | null }`.
- Lista: POST .../query `{ SEARCH, ANIO, PAGE_INDEX, PAGE_SIZE }` → filas con `total_count`.
- Opciones del formulario: GET .../opciones → `{ rows: [{ establecimiento, establecimientos: [{ id, nombre }] (distintos del propio), periodos: [{ id, nombre, anio, grados: [{ id, nombre, especialidades: [ids del plan] }] }] (del que recibe, en Inscripciones o Abierto, de cualquier sede, jornada y modalidad), especialidades: [{ id, nombre, libres }] (capacidad informativa, Regla 80), continuidad_automatica (alguna convocatoria del año la tiene) }] }`.
- Crear: POST .../ `{ ORIGENES: [ids], PERIODOS: [ids de un mismo año], GRADOS: [ids], ESPECIALIDADES: [ids], CUPO_MAXIMO | null, DOCUMENTOS: [nombres de 3 a 80, únicos, hasta 10] }` → `{ rows: [{ pk_convenio }] }`, uno por origen.
  - Todos quedan Propuestos y se avisa a cada origen (plataforma y correo).
  - Solo grados con áreas de especialidad, y especialidades con áreas en esos grados.
  - El front avisa, sin bloquear, «Para que los estudiantes continúen, incluya también [Grado] en [Especialidad].».
- Aceptar (el origen):
  - Previa: GET .../:id/aceptar/previa → `{ rows: [{ conflictos: [{ especialidad_id, especialidad, sede }], nuevas: [nombres] }] }`. Son las especialidades que alguna sede del origen ya tiene con el mismo nombre.
  - Aceptar: PUT .../:id/aceptar `{ VINCULOS: [{ FK_ESPECIALIDAD, SEDE, ACCION: VINCULAR | CREAR }] }`.
  - Crea las especialidades del convenio en el catálogo de cada sede del origen con esos grados (Regla 115), vinculadas a las del destino. CREAR usa el nombre «[Nombre] ([Establecimiento que recibe])».
- Rechazar (el origen): PUT .../:id/rechazar `{ MOTIVO (10–500) }`. Es final; para reintentar, el que recibe crea uno nuevo.
- Finalizar: PUT .../:id/finalizar `{ MOTIVO (10–500) }`.
  - Las complementarias creadas siguen hasta el cierre del año.
  - Las postulaciones de ese origen que no estén Adscrito quedan Descartadas (motivo Convenio finalizado).
  - Las especialidades creadas en el origen quedan inactivas.
  - También pasa solo a Finalizado cuando todos sus períodos se cierran.
- Renovar (el que recibe):
  - Previa: GET .../:id/renovar/previa → `{ rows: [{ periodos: [{ id, nombre }] (del año siguiente), equivalentes: [ids de la misma sede y jornada] }] }`.
  - Renovar: POST .../:id/renovar `{ PERIODOS }` crea un convenio Propuesto del año siguiente con el mismo origen, grados, especialidades y cupo. El origen debe aceptarlo; las especialidades de su catálogo se reutilizan.
- Todo queda en la Bitácora. Regla 114: no se puede quitar del plan la última área de una especialidad en un grado con convenio Propuesto o Aceptado.
- Back (8b): cada conflicto de la previa de aceptar trae también `sede_id`, y en `VINCULOS` el campo `SEDE` es ese id, no el nombre. Aceptar responde `{ estado, creadas, vinculadas }`, y rechazar y finalizar responden `{ estado }`. Los avisos por plataforma y correo todavía no salen.
- Mock: src/mocks/db/convenios.ts y src/mocks/handlers/convenios.ts. El usuario es IE Central. Aceptar el convenio con IE Sur pregunta por «Agropecuaria».

### 15. Matrícula complementaria: Continuidad (Sección 2.16.2, Continuidad automática, Regla 80)
- Pantalla: pestaña Continuidad del módulo.
  - Muestra a los adscritos que pasan al grado siguiente.
  - Filtros: búsqueda por nombre o documento, Estado y Especialidad, más el chip de Convocatoria.
  - Menú ⁞: Ver detalle y Asignar grupo, solo para Pendiente de grupo.
  - Asignar grupo es del Administrador del establecimiento, el Gestor administrativo o el Supervisor de sede con Guardar en la Sede y Jornada; lo valida el back.
- Base: /eval-col/cobertura-academica/matricula-complementaria/continuidad; respuestas en `{ rows }`, snake_case.
- Fila: `{ id, estudiante, documento, origen, especialidad, grado_actual, grado_siguiente, sede_jornada ("IE Central · Tarde"), convocatoria_id, convocatoria_anio, estado: PREVISTA | PENDIENTE_GRUPO | CREADA | SIN_CONTINUIDAD, motivo: PRINCIPAL_REPROBADA | COMPLEMENTARIA_REPROBADA | PRINCIPAL_RETIRADA | SIN_CONVENIO | null, grupo | null }`.
- Lista: POST .../query `{ SEARCH, FK_CONVOCATORIA, ESTADO, ESPECIALIDAD (nombre), PAGE_INDEX, PAGE_SIZE }` → filas con `total_count`.
- Grupos: GET .../:id/grupos → `{ rows: [{ id, codigo, cupo, libres }] }`. Solo los que dictan la especialidad en el período del grado siguiente (misma sede y jornada) y tienen cupo.
- Asignar grupo: POST .../:id/asignar-grupo `{ FK_TGRUPO }` → `{ rows: [{ pk_matricula }] }`. Crea la matrícula complementaria y la fila pasa a Creada; 409 si ya no está Pendiente de grupo o el grupo se quedó sin cupo.
- Solo back:
  - El proceso que llena la lista: quién continúa, la reserva del cupo del grado siguiente, la creación en el primer grupo con cupo, Pendiente de grupo si no hay, y Sin continuidad con su motivo.
  - Generar las pendientes al aceptarse el convenio del año siguiente.
  - Los avisos al acudiente y al origen.
- Back (8e): la lista la llena la tarea programada del back. El filtro `ESPECIALIDAD` compara el nombre sin distinguir mayúsculas. Las opciones de Convocatorias ya traen `continuan`, y los `libres` descuentan los puestos reservados para continuidad.
- Mock: src/mocks/db/continuidad.ts y src/mocks/handlers/continuidad.ts (convocatoria 2027 de IE Central; dos Pendiente de grupo).

### 16. Autorización de tratamiento de datos (Sección 2.1, Regla 81)
- Qué: la autorización vale por estudiante y Establecimiento (la misma de inscripción, prematrícula y portal). Es opcional al matricular; sin ella:
  - Los datos del estudiante (2.2 a 2.9, incluida la foto) se ven parcialmente enmascarados, salvo documento, nombres, apellidos y fecha de nacimiento. 2.1 y 2.10 a 2.15 se ven completos.
  - En Editar, 2.2 a 2.9 quedan en solo lectura con el aviso «Falta la autorización de tratamiento de datos del acudiente». El back debe rechazar cambios a esos bloques.
  - En la lista, la marca «Sin autorización» debajo del nombre.
- Listado `/matricula/query` y detalle `GET /cobertura-academica/matricula/:id` (bloque `matricula`): `sin_autorizacion: "S"|"N"`. Lo ideal es que el back ya mande enmascarados los datos de 2.2 a 2.9; el front los enmascara igual.
- Agregar: `AUTORIZACION_DATOS: "S"|"N"` en el body (hoy solo viaja con el mock, en `camposNuevosBody`). Falta: si el estudiante ya tiene la autorización del Establecimiento, devolverla con su fecha para mostrar la casilla marcada y en solo lectura.
- Registrar autorización de datos: POST /eval-col/cobertura-academica/matricula/:ID/autorizacion-datos `{ ACUDIENTE, AUTORIZACION: "S" }` → `{ rows: [{ pk_tmatricula }] }`. Matrícula Cursando y sin autorización; Administrador o Gestor administrativo del establecimiento; 409 si ya la tiene. Queda en la Bitácora quién la registró y cuándo. El front manda el nombre del acudiente; si el back prefiere el pk del acudiente, se cambia por un selector.
- Solo back: el acudiente también la da desde el portal (Mi cuenta › Autorizaciones, o Autorizar ahora). Corregir datos de identidad no la necesita (Regla 43).
- Adscripción (Regla 8, Sección 2.16): en la complementaria por adscripción, el que recibe ve los datos del estudiante (2.2 a 2.9) protegidos y en solo lectura, igual que sin autorización, y no se le ofrece Corregir datos de identidad. El detalle trae `origen_adscripcion` (nombre del establecimiento de origen o null); el back debe rechazar cambios del que recibe a esos bloques.
- Mock: src/mocks/db/autorizacion-datos.ts (sin autorización: pk múltiplo de 4) y el handler en src/mocks/handlers/matricula.ts.

### 17. Lista de Matrícula: columnas Metodología del grupo y Nuevo, filtro Nuevo (Matricula.md, Lista de estudiantes matriculados)
- Listado `/matricula/query`: por fila `metodologia_grupo` (nombre de la metodología del grupo) y `nuevo: "S"|"N"` (sin matrícula el año anterior en la entidad territorial). Filtro `NUEVO: "S"|"N"|null` en el body. También en el export.
- Columna Establecimiento: el doc la muestra solo si el usuario tiene asignaciones en más de un establecimiento; falta un dato del back con ese conteo para ocultarla.
- Postulación por el origen: si dos funcionarios toman el último cupo a la vez, el segundo recibe 409 «No hay cupo libre en [Especialidad].».
- Mock: `esNuevo` (pk % 5 === 1) y `metodologiaNombre` en src/mocks/handlers/matricula.ts y src/mocks/db/metodologia.ts.

### 18. Reglas de la lista que el back debe validar (Matricula.md, tabla de acciones)
- Editar (PATCH de la matrícula): solo con la matrícula Cursando; el front ya no lo ofrece en otros estados.
- Eliminar matrícula: el front la quitó (el doc no la contempla: «Anular no es eliminar»; lo que se corrige se anula o se reactiva). El endpoint de borrado (PUT de la matrícula) no debe quedar disponible para esta vista.
- Roles: Cambiar de grado, Reactivar y Registrar autorización de datos son solo del Administrador o del Gestor administrativo del establecimiento. El front solo mira el permiso Guardar de la vista (`MATRICULA`), así que el back debe rechazar a otros roles (p. ej. el Supervisor de sede).
- Exportar (Regla 47): los datos protegidos salen enmascarados igual que en pantalla: los de estudiantes de otros establecimientos (adscripción) y los de 2.2 a 2.9 sin autorización (tarea 16).

### 19. Archivo de soporte con revisión (C.1.EDI.1–1j; Sección 2.14, Reglas 6, 23 y 73; Sección 2.16.1)
- Pantalla: Editar matrícula, bloque 14. Cada operación se guarda al momento (no con Guardar de la matrícula).
- Lista de valores nueva: «Resultado de la revisión del soporte» = Soportado, Soportado con observaciones, No soportado; Sin revisar es el estado inicial.
- Ruta: GET /eval-col/cobertura-academica/matricula/:ID/soportes → filas `{ pk_tmatricula_archivo, tipo: "DOCUMENTO_IDENTIDAD"|"CERTIFICADO_ESTUDIOS"|"CERTIFICADO_MEDICO"|"HOJA_FIRMADA"|"OTRO", fk_tarchivo, archivo_nombre, archivo_tamano (bytes), subido_por, subido_at, revision: "SIN_REVISAR"|"SOPORTADO"|"SOPORTADO_OBSERVACIONES"|"NO_SOPORTADO", observacion, revisado_por, revisado_at }`. Solo los cargados; el front completa los fijos que falten.
- Ruta: POST /files/eval-col/cobertura-academica/matricula/:ID/soportes (multipart) `{ TIPO, PK_TMATRICULA_ARCHIVO? }` + `ARCHIVO`. Sin PK: adjunta un fijo (si ya existía, lo reemplaza) o agrega uno a OTRO. Con PK: reemplaza. Siempre deja la revisión en SIN_REVISAR sin revisor ni fecha; la revisión, la observación y el nombre del archivo anteriores van a la Bitácora (Regla 73). PDF, JPG o PNG, máx. 10 MB.
- Ruta: PUT /eval-col/cobertura-academica/matricula/:ID/soportes/:PK/revision `{ RESULTADO, OBSERVACION }`. OBSERVACION obligatoria (10–500) si RESULTADO ≠ SOPORTADO. Revisor y fecha automáticos. Va a la Bitácora.
- Ruta: PUT /eval-col/cobertura-academica/matricula/:ID/soportes/:PK/quitar. Solo TIPO = OTRO («Los soportes fijos no se quitan: se reemplazan.»). El archivo y su revisión quedan en la Bitácora.
- Documentos del convenio (complementaria por adscripción): GET /eval-col/cobertura-academica/matricula/:ID/documentos-convenio → `{ pk_tdocumento, nombre, entregado: "S"|"N" }` (vacío si no es adscripción); PUT .../documentos-convenio/:PK `{ ENTREGADO: "S"|"N" }`, solo el establecimiento que recibe. No bloquea la matrícula.
- Ver archivo: usa el `fk_tarchivo` con `POST /files/view-token/:id` (existente).
- Errores: 400 con el mensaje del RAISE → el front lo muestra en el diálogo.
- Mock: src/mocks/db/matricula-soportes.ts, src/mocks/handlers/matricula-soportes.ts.
- Pendiente de decidir: si la Hoja de matrícula firmada sigue por `/hoja-firmada` o pasa a esta ruta con TIPO = HOJA_FIRMADA (el front usa esta).

### 20. Digitado en el SIMAT (C.1.AGR.1, bloque 1)
- Ruta: POST y PATCH /files/eval-col/cobertura-academica/matricula[/:ID]: sumar `FK_FUNCIONARIO_DIGITA_SIMAT` (int|null) y `FECHA_DIGITACION_SIMAT` (yyyy-MM-dd|null). El detalle devuelve `fk_funcionario_digita_simat` y `fecha_digitacion_simat`.
- Errores: 400 si hay funcionario sin fecha («La fecha de digitación en el SIMAT es obligatoria si indica quién digitó.»).
- Front: hoy viaja solo con el mock (`camposNuevosBody` en to-create-matricula-body.ts).

### 21. Estudiante existente: traslado y acudiente (C.1.AGR.1, C.1.AGR.2; Reglas 8)
- Ruta: GET /eval-col/cobertura-academica/matricula/estudiante-existente?DOCUMENTO: sumar `tipo_documento`, `ultimo_acudiente_correo_enmascarado`, `ultimo_acudiente_telefono_enmascarado` y, si tiene una matrícula Retirada por traslado en otra IE en el período, `traslado_institucion`, `traslado_grado_valor`, `traslado_grado_nombre`, `traslado_periodo`.
- El back debe rechazar el alta en un grado distinto al del traslado: «Por traslado, debe ser [Grado].».
- Mock: src/mocks/handlers/estudiante-existente.ts.

### 22. Ya matriculado y matrícula en otro establecimiento (C.1.AGR.6, C.1.SOL.1; Regla 71)
- Ruta: la verificación del alta (`/coverage/matricula/check` en el mock) suma `periodo { id, label }` y `otroEstablecimiento` (boolean).
- Mismo grado y período: el back rechaza el alta (AGR.6).
- Cursando en otra IE: la matrícula se crea y luego POST /files/eval-col/cobertura-academica/matricula/:ID/solicitud-retiro (multipart `ARCHIVO`, PDF/JPG/PNG ≤ 10 MB) → `{ rows: [{ solicitud: { estado: "PENDIENTE" } }] }`. Errores: 400 sin evidencia o si la del origen no está Cursando.
- Mock: src/mocks/handlers/matricula.ts, src/mocks/handlers/solicitud-retiro.ts.

### 23. Retiro con institución de destino, acta y SIMPADE (C.1.RET.1a, C.1.LIS.3b, C.1.RET.5)
- Retirar: POST /eval-col/cobertura-academica/matricula/lote/retirar suma `INSTITUCION_DESTINO` (string|null).
- Listado `/matricula/query`: por fila `retiro_traslado` ("S"|"N"), `acta_retiro`, `fecha_retiro`, `simpade_ingresado` ("S"|"N").
- Marcar SIMPADE: PUT /eval-col/cobertura-academica/matricula/:ID/simpade `{ FECHA_INGRESO, FK_FUNCIONARIO }` → `{ rows: [{ pk_matricula }] }`. Errores: 400 (faltan datos o fecha futura), 409 (sin retiro por traslado o ya marcado). Solo Administrador y Gestor administrativo; queda en la Bitácora.
- Acta: reporte `matricula-acta-retiro` (`/reportes/matricula-acta-retiro`, `filters: { IDS: [pk] }`), PDF. Sin mock en reportes.
- Mock: src/mocks/db/acciones-lote.ts, src/mocks/handlers/acciones-lote.ts, src/mocks/handlers/matricula.ts.

### 24. Solicitud de retiro: vencimiento (C.1.SOL.2; Regla 71)
- GET /eval-col/cobertura-academica/matricula/:ID/solicitud-retiro suma `vence` (yyyy-MM-dd).
- Mock: src/mocks/db/solicitud-retiro.ts (a 5 días de la solicitud).

### 25. Asignaturas: detalle de registros (C.1.EDI.1f)
- GET /eval-col/cobertura-academica/matricula/:ID/asignaturas suma `registros: string[]` por fila (p. ej. «4 resultados en el Registro de Resultados», «La definitiva del Período 1»); vacío si `tiene_registros` es falso.
- Mock: src/mocks/db/matricula-asignaturas.ts.

### 26. Exportar con todos los datos de la matrícula (C.1.LIS.4–5; Regla 47)
- Listado `/matricula/query` suma `birth_date`, `address`, `phone`, `guardian_relationship`, `guardian_email`, `asignaturas` (conteo y especialidad) y `soportes` (nombres de los cargados).
- Reporte `matricula`: `columns` admite `tipo_matricula`, `birth_date`, `address`, `phone`, `guardian_relationship`, `guardian_email`, `asignaturas`, `soportes`. Pie: «Generado por… Los archivos de soporte no se exportan…».
- Mock: src/mocks/handlers/matricula.ts (valores fijos).

### 27. Aviso por inasistencia continua (C.1.AVI.1; Regla 74)
- Proceso diario: con 30 días calendario sin asistir ni excusa válida (sin contar días inhábiles del Calendario Académico), notificación solo en la campana al Administrador y al Gestor administrativo del establecimiento. No retira solo.
- Notificación: tipo `MATRICULA_INASISTENCIA` («Aviso del sistema»), `deep_link` al detalle de la matrícula, `contexto` «Matrícula · [grupo]», `acciones: [{ etiqueta: "Retirar", deep_link }]`.
- Front: Retirar hoy abre la lista filtrada por el documento; falta abrir el retiro con el motivo de la novedad preseleccionado.
- Mock: src/mocks/db/notificaciones.ts.

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

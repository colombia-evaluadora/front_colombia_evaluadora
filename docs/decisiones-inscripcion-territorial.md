# Inscripción y reservas: decisiones técnicas y pendientes

Registro de lo que se decidió sin una regla explícita del documento funcional y de lo que falta, para revisarlo
y decidir más adelante. Cada punto dice **qué se hizo**, **dónde vive** y **qué habría que decidir**.

Back: SSO `postgres/migrations`. Front: `src/features/coverage/inscripcion-reservas`.

---

## 1. Numeración de migraciones

| Módulo | Migraciones |
|---|---|
| Inscripciones y Configuración | V423 (DDL), V423.1, V424, V424.1, V425, V426 (endpoints) |
| Entidad territorial | V430 (DDL), V430.1, V431, V431.1, V432, V433 (endpoints) |
| Reserva de cupo (aún no existe) | Debe ir **por debajo de V423**; V409 está libre y nunca existió en git |

- **Riesgo:** V426 y V430–V433 existieron en git y se borraron (V426 era `fn_actividad_material_archivo_registrar`,
  limpieza #501). Si siguen en `flyway_schema_history` de test o producción, Flyway las da por aplicadas y **no
  crea nada, sin error**.
- **Decidir antes del deploy:** revisar con `/server-status` el historial de los servidores; si están, renumerar.
- Lo antiguo que se movió: antes eran V476–V478.7.

## 2. Inscripciones (V423–V426)

- **Tareas programadas.** `TareasInscripciones` (query-service) corre solo en la instancia `eval-col`
  (`query.tareas.inscripciones.*`). Llama a `fn_inscripcion_tareas_programadas_interno`, que toma un candado
  (advisory lock) para que dos réplicas no corran a la vez. Hace sorteos, cierre de la lista de espera, admisión
  automática y vencimiento de elecciones (24 h).
- **Dos relojes.** `fn_convivencia_ahora()` es hora de Colombia y `CURRENT_TIMESTAMP` es UTC (5 h de diferencia).
  `POR_ELEGIR_AT` y los plazos usan `fn_convivencia_ahora()`. *Decidir:* si todo el módulo debe usar uno solo.
- **Cierre de la lista de espera.** Vencida la Fecha límite de matrícula: En lista de espera → No admitida
  *Sin cupo*; Pendiente → No admitida *Sin evaluar*. Son motivos de sistema (`ES_SISTEMA`), ocultos en el catálogo.
- **Cascada.** Usa el estado de período `I` (Inscripciones), porque `fn_periodo_inscripcion_abierto` significa `A`.
- **Situación de edad.** Reusa `fn_situacion_edad` (V309); el grado del período se cruza por `TGRADO.CODIGO` = `VALOR`
  de la lista GRADOS. Si falta un dato, `SIN_CALCULAR`. Es etiqueta, no bloquea.
- **Cupos disponibles.** `fn_inscripcion_cupos_disponibles` = capacidad − matriculados − opciones Admitidas.
  *Pendiente:* con reservas de cupo reales debería descontar también las reservas vigentes (y moverse a la capa
  de reservas).
- **Pendientes:** colecciones Postman, notificaciones, filtro por circuito.

## 3. Reserva de cupo

- Solo existe la tabla vieja `TRESERVA_CUPO` (V22), sin núcleos, validaciones ni endpoints. El front funciona con mocks.
- *Decidir:* ampliar `TRESERVA_CUPO` (estado, origen, tipo de cupo, motivo de liberación) o crear una tabla nueva,
  y que Admitir cree la reserva (Regla 28) y Anular / Elegir la liberen.
- Hoy Seguimiento cuenta como "reservada" **cualquier `TRESERVA_CUPO` activa** del período siguiente, sin mirar su estado.

## 4. Entidad territorial (V430–V433)

### 4.1 Roles y alcance
- Supervisor territorial (`CEVAL-SUP_TER`) y Administrador territorial (`CEVAL-ADM_TER`); solo el Administrador
  escribe el calendario. El alcance sale de `fn_territorial_establecimientos`.
- El gate `fn_territorial_gate` lanza 42501 a mano (el lint da el aviso `GATE-EN-LINEA`). *Decidir:* si pasarlo a
  un helper de permisos común.
- `contexto` no tiene gate a propósito: a quien no es territorial le devuelve `null` y el front oculta la pestaña.

### 4.2 Proyección
- Sin fila en `TPROYECCION_CUPOS` = Proyectada. Sin Supervisor territorial activo, se considera Aprobada.
- Aprobar / Devolver decide **todos** los períodos en Inscripciones del establecimiento a la vez.
- **Ver detalle** (`fn_proyeccion_detalle_interno`): un renglón por grado (`CODIGO`) de todo el establecimiento.
  Vienen = Cursando hoy en el grado `CODIGO − 1` de cualquier sede; sin ese grado ofrecido, sin comparación.
  Por sede: pasan a otra sede = vienen de la sede − su cupo.
- *Decidir:* **Repitentes** sale vacío (no hay resultados de matrícula todavía) y **Prematrículas Continúa** cuenta
  las reservas de cupo activas del grado en el período proyectado (no hay prematrícula "Continúa" en el back).
- *Decidir:* el "anterior" es hoy cualquier matrícula Cursando del grado anterior, no el período anterior de la
  misma modalidad (Regla 46).

### 4.3 Calendario
- Finalizado no se guarda: es un Publicado cuya Fecha límite ya pasó (o, si se amplió para algún establecimiento,
  la última fecha ampliada).
- Publicar aplica las fechas a los grupos de admisión y períodos que aún no las tienen (no pisa las definidas).
- **Ampliar fecha** (`POST /calendarios/:ID/ampliar`, `CAMPO` + `FECHA`): cierre de inscripción, liberación de
  reservas o Fecha límite de matrícula.
  - *General* (sin `ESTABLECIMIENTOS`): cambia el calendario y la toman quienes la heredaron, es decir, los que
    aún tienen la fecha anterior del calendario (`TGRUPO_ADMISION.FECHA_CIERRE`,
    `TPERIODO_INSCRIPCION_CONFIG.FECHA_LIBERACION_RESERVAS`, `TPERIODO_ACADEMICO.FECHA_LIMITE_MATRICULA`). Un
    período cuya fecha fin es anterior a la nueva Fecha límite no la toma.
  - *Por establecimiento* (solo la Fecha límite): amplía sus períodos aunque hayan ajustado la fecha; no cambia
    el calendario.
  - *Decidir:* "heredó" se deduce por igualdad con la fecha del calendario; no hay una marca explícita.
- **Habilitar o suspender la inscripción en línea** (`POST /calendarios/:ID/inscripcion-en-linea`): pone
  `TPERIODO_ACADEMICO.RESERVA` (Habilitar reserva de cupos, Regla 31) en los períodos en Inscripciones del
  calendario en los establecimientos elegidos; el registro con su motivo queda en `TCALENDARIO_INSCRIPCION_LINEA`.
  Al habilitar se omiten (y se cuentan) los períodos sin un grado con grupos y cupos. No avisa a nadie todavía.

### 4.4 Seguimiento
Compara el período **Abierto** con el período **en Inscripciones** de la misma sede y jornada (`fn_seguimiento_celdas`):

| Columna | Regla aplicada |
|---|---|
| Cursando | Matrículas con estado `VALOR = '1'` (Cursando) del período Abierto |
| Reservadas | Tienen `TRESERVA_CUPO` activa en el período siguiente |
| Sin continuidad | Sin reserva, con grado siguiente, y ese grado no existe en el período siguiente o no tiene cupo |
| Omitidos | Cursando − Reservadas − Sin continuidad (incluye último grado y los que aún no reservan con cupo) |
| Traslados pendientes | `TTRASLADO_ESTUDIANTE` sin `FECHA_CAPTURA` y estado fuera de CAPTURADO / RECHAZADO / ANULADO / CANCELADO, hacia un grupo del establecimiento |

- *Decidir:* confirmar los nombres reales de `ESTADO_TRASLADO` en la base de test (la local no los tiene).
- *Decidir:* si "Omitidos" debe separar a los del último grado.
- El grado siguiente se cruza por `TGRADO.FK_TLV_GRADO_SIGUIENTE` → `VALOR` = `CODIGO` del grado del período siguiente.
- Front: el detalle no agrupa "2° a 6°" como en el prototipo; cada grado va en su fila.
- Exportar es un CSV que arma el front (no pasa por `/reportes`).

### 4.5 Orientaciones
- Tabla `TORIENTACION_TERRITORIAL`: motivo (`FALTA_CONTINUIDAD`, `TRASLADOS_PENDIENTES` o vacío), tema, texto de
  10 a 1000 caracteres y autor.
- **Temas:** del prototipo salen Cobertura, Extraedad y Permanencia; agregué Traslados, Matrícula, Calendario y Otro.
  Están fijos en `fn_orientacion_validar` y en `TEMAS_ORIENTACION` del front. *Decidir:* lista real, y si va a un catálogo.
- Sección Orientaciones (front, con mocks): lista con estado Enviada / Atendida, Nueva orientación en línea
  (sin alerta vinculada) y Ver con la respuesta del establecimiento.
- Back: `GET /orientaciones` (`fn_orientaciones_listar`). Atendida = `ATENDIDA_AT` no nulo; columnas
  `RESPUESTA`, `ATENDIDA_AT` y `FK_TUSUARIO_RESPONDE` ya existen en `TORIENTACION_TERRITORIAL`.
  "Enviada por" = primer nombre y apellido + "(Supervisor)" o "(Administrador)" (sin género; el prototipo dice "Supervisora").
- *Pendiente:* la pantalla y el endpoint del establecimiento para **responder** (que llena esas columnas), y cómo
  le llega la orientación (notificación).

### 4.6 Redistribución
- **Ubicar = opción de redistribución.** Se crea una `TINSCRIPCION_OPCION` Admitida con `ES_REDISTRIBUCION`
  (preferencia 4) más una fila en `TUBICACION_TERRITORIAL` (tipo de cupo, confirmación, 24 h, liberación).
  Así el cupo se descuenta con la función de siempre y la inscripción queda Admitida.
- **En redistribución:** inscripción No admitida, con alguna opción *Sin cupo* y sin ubicación vigente; su
  establecimiento de origen (primera opción) debe estar en el alcance.
- **Opciones para ubicar:** mismo grado (código) y modalidad, períodos en Inscripciones del alcance, con cupo
  oficial libre, sin repetir un período donde ya estuvo. `id` de la opción = `PK_TGRADO`.
- **Sede más cercana:** menor distancia; sin distancia, la de más cupo. Con `FK_OPCION` vacío el back ubica en esa (el front ya no lo usa).
- **Ubicar por lote:** mismo grado y modalidad (la lista bloquea las demás filas), una opción para todos, solo
  filas con cupo del tipo elegido para todos. El back omite a quien ya no está en redistribución y devuelve
  `{ubicados, omitidos}`; 22023 si son todos.
- **Ubicados sin grupo:** ubicación sin liberar y sin `TMATRICULA` de esa inscripción.
- **Liberar:** motivo de 10 a 500; la opción pasa a Descartada y la inscripción vuelve a Redistribución.

- **Tipo de cupo:** el cupo libre del grado se parte en contratado libre y oficial libre (= disponible −
  contratado libre). Ubicar con Contratado aparta el lugar en el grupo del grado con más contratado libre
  (`TUBICACION_TERRITORIAL.FK_TGRUPO_CONTRATADO`).
- Una ubicación liberada no impide volver a ubicar en ese mismo período.
- Ubicar toma un candado del grado (`FOR UPDATE`) y vuelve a leer el cupo: dos ubicaciones a la vez no se pisan.

Decisiones abiertas:
- **Distancia:** haversine sobre `GEOREFERENCIACION` "lat,lon" de `TESTUDIANTE` y `TSEDE`. La base local no
  tiene ninguna cargada → la distancia sale vacía. *Decidir:* formato real y fuente (¿dirección del acudiente?).
- **Área de influencia:** "a 2 km o menos" (`fn_redistribucion_dentro_area`). *Decidir:* definición oficial
  (comuna, barrio, polígono).
- **Confirmación del acudiente:** se guarda el plazo de 24 h, pero falta el endpoint para confirmar y la tarea
  que venza las ubicaciones sin confirmar (¿liberar solas?).
- **Días para el límite:** Fecha límite de matrícula del período − hoy.
- **Opciones de Ubicar por lote:** salen de la primera inscripción marcada; si a otra no le sirve (p. ej. ya
  estuvo en ese período), el back la rechaza con 22023 y no ubica a nadie. *Decidir:* omitirla también.

### 4.7 Cupos contratados
- Tabla `TCUPO_CONTRATADO` (un valor por grupo; sin fila = 0). Lista los grupos de los períodos en Inscripciones
  de los **oferentes** del alcance, también los que tienen 0.
- **Oferente:** `TESTABLECIMIENTO.OFERENTE_CUPO_CONTRATADO`. Se marca desde la sección (botón *Oferentes*,
  `POST /oferentes` con la lista completa), solo para establecimientos No oficial
  (`fn_disciplinario_establecimiento_no_oficial`); no se quita a uno con cupo contratado definido. Lo hacen los
  dos roles territoriales. *Pendiente:* el campo en el formulario del Establecimiento (documento: al crearlo o
  modificarlo, también el Superadministrador); no se tocó `fn_est_crear` / `fn_est_actualizar` (V573/V574).
- **Ocupados contratados** = ubicaciones contratadas a ese grupo cuya inscripción ya tiene matrícula que ocupa
  plaza, aunque el establecimiento la haya puesto en otro grupo (el cupo se carga donde se apartó).
  **Retenidos** = las que aún no tienen matrícula. **Libres** = contratado − ocupados − retenidos.
- **Propias** = matrículas que ocupan plaza y reservas (`TRESERVA_CUPO`) del grupo que no son de cupo contratado.
- El cupo contratado va de ocupados + retenidos hasta cupo − propias, con los dos mensajes del documento.
- Solo el Administrador territorial lo edita (gate y `role_query`); el Supervisor lo consulta.
- *Pendiente:* las admisiones y matrículas propias todavía pueden consumir el cupo contratado libre:
  `fn_inscripcion_cupos_disponibles` y `fn_matricula_validar_cupo` no lo descuentan.
- *Decidir:* si "Retenidos" debe contar solo las pendientes de confirmación del acudiente (hoy cuenta toda
  ubicación contratada sin matrícula).

### 4.8 Solicitudes de retiro
Back (V430–V433): `TSOLICITUD_RETIRO` + `TSOLICITUD_RETIRO_AVISO` (historial). Endpoints territoriales: listar,
`registrar-retiro` y `cerrar` (estos dos solo `CEVAL-ADM_TER`). El estado se **deduce** (`fn_solicitud_retiro_estado`):
- Vencida = hoy pasó el día hábil número *plazo* desde la solicitud (`fn_retiro_vence`). Día hábil = lunes a
  viernes y hábil en el calendario del período del origen (`fn_calendario_dia_habil`, Regla 109).
- Plazo = `PLAZO_SOLICITUD_RETIRO` del calendario de cobertura **publicado** del Año · Modalidad · Ciclo del
  período del origen; 5 si no hay. Se guarda al crear la solicitud.
- Registrar retiro hace los mismos pasos que `fn_matricula_retirar` (V166): Cursando (VALOR 1) → Retirado (VALOR 4)
  y fila en `TRETIRO_MATRICULA` con el motivo de la novedad. No llama a V166 porque esa función exige el permiso
  del establecimiento. *Decidir:* extraer un `_interno` común en V166.
- Días sin respuesta: hábiles desde la solicitud (Pendiente / Vencida) o días desde la decisión (Por anular).
- Alcance: la solicitud se ve si el origen **o** el solicitante están en el alcance.
- Ya existen los núcleos `fn_solicitud_retiro_crear_interno` y `fn_solicitud_retiro_objetar_interno`, **sin
  endpoint**: los usarán la matrícula del destino y la pantalla del origen.

Front y reglas:
- Estados: Pendiente, Vencida, Objetada, Por anular en el destino, Atendida, Cerrada sin retiro.
- El rol territorial decide **solo Vencidas u Objetadas**: Registrar retiro (Atendida; la matrícula del origen
  pasa a Retirado) o Cerrar sin retiro con motivo de 10 a 500 (Por anular en el destino → Cerrada sin retiro
  cuando el destino anula).
- Solo el **Administrador territorial** ve esos dos botones (el Supervisor solo consulta). *Decidir:* confirmarlo.
- El contador de la pestaña cuenta Pendientes, Vencidas y Objetadas. *Decidir:* si solo las que esperan decisión.
- *Pendiente:* llamar a `crear_interno` desde la matrícula del destino (al matricular a alguien que está Cursando en
  otro EE, con la evidencia); pantalla y endpoint del origen para objetar o atender (`ATENDIDA_ORIGEN_AT`); la
  anulación de la matrícula del destino (`ANULADA_DESTINO_AT` → Cerrada sin retiro); las alertas diarias de la
  campana (hoy solo hay historial de avisos, sin notificación real) y el bloqueo de acciones administrativas del destino.

### 4.9 Paginado
- Redistribución y Cupos contratados paginan en el back: `POST /consulta/redistribucion` y
  `POST /consulta/cupos-contratados` (`FILTERS`, `PAGEINDEX`, `PAGESIZE`) devuelven `{ total, filas }`. Sin
  `PAGESIZE` devuelven todo (lo usa Exportar). La ruta es `/consulta/...` y no `.../query` para no chocar con
  `POST /cupos-contratados/:ID`.
- En Redistribución, sin filtro de área se pagina antes de buscar la sede más cercana; con el filtro hay que
  calcularla para todas.
- Seguimiento calcula el cupo una vez por grado siguiente, no por matrícula.
- Siguen completas y paginadas en el front: Proyección, Seguimiento, Ubicados, Orientaciones y Solicitudes de retiro.

## 5. Front

- Un solo camino: el front llama a las rutas reales (`evalCol`) y los mocks MSW imitan al back
  (`*/api/eval-col/...`, `{ rows: [{ datos }] }`); los multipart van por `*/api/files/eval-col/...`.
- `PROBE_ENDPOINTS` en `api-client.ts`: el contexto territorial nunca muestra toast (404 esperado).
- Estado en la URL: `terr`, `terrQ`, `terrEE`, `terrOrientar`, `terrRed`, `terrId`.
- Ícono nuevo en `icons.tsx`: `NavigationArrowIcon` (Orientar por traslados) y `CalendarPlusIcon` (Ampliar).
- Exportar en Seguimiento y Redistribución es CSV del lado del front. *Decidir:* si deben pasar a `/reportes` (PDF/Excel).

## 6. Pruebas

- Back: scripts con `BEGIN … ROLLBACK` contra el `sso-postgres` local (base parcial: hubo que sembrar estados de
  período `A`/`I`, matrículas en Cursando, una reserva y un traslado). No se probó en un servidor.
- Front: tests de los mocks en `src/mocks/handlers/entidad-territorial.test.ts` e `inscripciones*.test.ts`.
- No se revisó en el navegador (el prototipo es la especificación).

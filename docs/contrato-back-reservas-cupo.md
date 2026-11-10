# Contrato back ↔ front: Reservas de cupo

Qué necesita el front de la pestaña **Reservas de cupo** de la vista *Inscripción y reservas* (ítem de menú *Inscripciones*, ruta `/app/cobertura/inscritos`) para conectarse al backend real. Hoy todo funciona con MSW: los handlers en `src/mocks/handlers/reservas-cupo.ts` y `reservas-cupo-acciones.ts` son la referencia ejecutable de este contrato.

Las reglas de negocio salen de `docs/Cobertura Educativa.md` (Secciones 3.2, 3.2.1, 3.2.2 y 3.6) y se citan como *Sección X* / *Regla N*.

---

## 1. Convenciones

### 1.1 Qué manda y espera el front hoy

- Todas las rutas cuelgan de `/api` (axios `api`, `src/lib/api-client.ts`), con el prefijo `/coverage/...`.
- **Cuerpos y respuestas en camelCase**, con los tipos de `src/features/coverage/inscripcion-reservas/api/types/`.
- Las lecturas con filtros van por **POST** (`api.query`), con los filtros en el body.
- Paginación **0-based**: `pageIndex`, `pageSize`. La respuesta de una lista trae `rows`, `pageCount` y `totalCount`.
- Fechas: `yyyy-MM-dd` para días y ISO 8601 (`2026-09-15T08:12:00`) para fecha y hora.
- Los estados viajan como códigos en MAYÚSCULAS (`RESERVADA`, `PENDIENTE`…). El front pone las etiquetas.

### 1.2 Si el endpoint vive en eval-col

El resto del front (matrícula, períodos) habla con `/eval-col/...` en **UPPER_SNAKE** y recibe filas en snake_case envueltas en `{ rows: [...] }` (ver `CLAUDE.md` del front, §5 y §7). Si este módulo se implementa ahí:

- Mantengan **los mismos campos y significados** de este documento; el nombre de cada campo puede seguir la convención de eval-col (`FK_TRESERVA`, `PAGE_INDEX`, `total_count` repetido por fila…).
- El front adapta en cada hook de `api/query` y `api/mutations` (mapeo `toXxx(row)` y armado del body), como ya hace matrícula. Avísennos los nombres reales o pasen la colección Postman.
- Los catálogos (motivos, estados) deberían venir de **Listas de Valores** (`GET /eval-col/select/:CATEGORIA`). Las categorías que usa el manual: *Motivo de liberación*, *Motivo de retiro*, *Motivo del traslado*, *Motivo de rechazo de traslado* y *Estado del traslado*.

### 1.3 Errores

- El front muestra el `message` del cuerpo de error tal cual (toast). Debe ser un texto para el usuario, en español.
- Códigos que distingue: **400** (dato inválido), **404** (no existe la reserva), **409** (la acción no aplica al estado actual: ya tiene traslado pendiente, ya no está Reservada, sin cupo…).
- Los textos de error que define el manual están en cada endpoint; úsenlos literalmente.

### 1.4 Permisos

La vista es una sola (`Inscripción y reservas`) con Guardar (Administración del Sistema, Sección 4.3). Las acciones de escritura son del **Administrador del establecimiento** y el **Gestor administrativo del establecimiento**; el **Supervisor** y el **Administrador territorial** solo tienen *Solicitar traslado* (con más campos, ver §3.8). El back valida el rol en cada endpoint; el front oculta lo que no aplica con `useMenuPermission`.

---

## 2. Modelos

### 2.1 Reserva de cupo (fila de la lista) — `ReservaCupo`

| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | string | PK de la reserva. |
| `estudiante` | string | Nombre completo. |
| `documento` | string | Número de documento (sin enmascarar: es el propio establecimiento). |
| `establecimientoOrigen` | string \| null | Solo en **traslados entrantes**: el establecimiento que lo envía (se muestra junto al nombre). |
| `grado` | string | Grado de la reserva, p. ej. `"7°"`. |
| `sede` | string | |
| `jornada` | string | |
| `periodo` | string | Período siguiente, `"2028 · Anual · Ciclo 1"`. |
| `estado` | `RESERVADA` \| `SIN_CONTINUIDAD` \| `LIBERADA` \| `MATRICULADA` | Sección 3.2, *Estados de la reserva*. |
| `origen` | `PREMATRICULA` \| `RESERVAR_CUPOS` \| `TRASLADO` \| `REDISTRIBUCION` \| `INSCRIPCION` | `REDISTRIBUCION` = **reserva protegida** (Sección 3.5): el front no ofrece Liberar ni Solicitar traslado. |
| `confirmadaPorAcudiente` | boolean | `false` + `RESERVADA` = marca *Por confirmar*. |
| `estadoTraslado` | `PENDIENTE` \| `ACEPTADO` \| `RECHAZADO` \| `CANCELADO` \| null | Del traslado guardado en la reserva (Sección 3.2.1). |
| `destinoTraslado` | string \| null | Para la marca *Traslado pendiente hacia [destino]*. |
| `trasladoEntrante` | boolean | `true` = fila de un traslado entrante Pendiente en **este** establecimiento (destino). No cuenta en cupos. |
| `motivoLiberacion` | string \| null | Solo en Liberadas: se muestra como marca. |

### 2.2 Detalle — `ReservaCupoDetalle` (extiende `ReservaCupo`)

| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `tipoDocumento` | string | Sigla, p. ej. `"TI"`. |
| `matriculaOrigen` | string | `"2026 · 6° · Grupo 601"`. |
| `decisionPrematricula` | string | *Continúa*, *Solicita traslado*, *Se retira* (Sección 3.1). |
| `periodoAcademico` | string | `"2027 · Mañana · Anual"` (año · jornada · modalidad). |
| `tipoCupo` | `OFICIAL` \| `CONTRATADO` | Regla 76. |
| `fechaReserva` | `yyyy-MM-dd` | |
| `asignadaPor` | string | `"Sistema"` o el usuario. |
| `traslado` | `DatosTraslado` \| null | Ver abajo. |
| `historial` | `CambioReserva[]` | Más reciente primero. |

`DatosTraslado` (Sección 3.2.1, *Datos del traslado*): `establecimientoDestino`, `motivo`, `jornadaSedePreferida` (string \| null), `hermanoVerificado` (boolean \| null), `compartirSoportes` (boolean), `observacion` (string \| null), `estado` (estado del traslado), `respondidoPor`, `fechaRespuesta`, `motivoRechazo` (string \| null).

`CambioReserva`: `id`, `fecha` (ISO), `usuario`, `cambio` (texto), `valorAnterior`, `valorNuevo` (string \| null). Sale de la Bitácora de la reserva (Sección 8).

---

## 3. Pestaña Reservas de cupo

### 3.1 Lista — `POST /coverage/reservas-cupo/query`

Body:

```json
{
  "filters": {
    "q": "martinez",
    "rapido": "POR_CONFIRMAR",
    "sede": "IE Central",
    "jornada": "Mañana",
    "grado": "7°",
    "estado": "RESERVADA",
    "estadoTraslado": "PENDIENTE"
  },
  "sorting": [{ "id": "estudiante", "desc": false }],
  "pageIndex": 0,
  "pageSize": 10
}
```

- Todos los filtros son opcionales. `q` busca por **nombre o documento** del estudiante.
- `rapido` (los contadores clicables): `TODAS` o ausente, `RESERVADAS`, `SIN_CONTINUIDAD`, `POR_CONFIRMAR`, `TRASLADOS_POR_RESPONDER`.
  - `RESERVADAS`: estado Reservada, sin traslados entrantes.
  - `POR_CONFIRMAR`: Reservada con `confirmadaPorAcudiente = false` (Sección 3.2, *Por confirmar*).
  - `TRASLADOS_POR_RESPONDER`: traslados entrantes Pendientes (Sección 3.2.1).
- `sorting[].id` es uno de `estudiante`, `grado`, `sede`, `jornada`, `estado`.
- Alcance: reservas del Período siguiente del Establecimiento del usuario **más** los traslados entrantes Pendientes hacia él.

Respuesta:

```json
{
  "rows": [ /* ReservaCupo */ ],
  "pageCount": 21,
  "totalCount": 204,
  "contadores": {
    "todas": 204,
    "reservadas": 182,
    "sinContinuidad": 6,
    "porConfirmar": 14,
    "trasladosPorResponder": 2
  }
}
```

Los **contadores respetan la búsqueda y los filtros del panel, pero no el filtro rápido** (si no, el contador activo siempre igualaría al total).

### 3.2 Catálogos de los filtros — `GET /coverage/reservas-cupo/catalogos`

```json
{ "sedes": ["IE Central", "Sede Norte"], "jornadas": ["Mañana", "Tarde", "Nocturna"], "grados": ["Transición", "1°", "…", "11°"] }
```

Sedes, jornadas y grados del Establecimiento en el período siguiente.

### 3.3 Reservar cupos (Regla 35)

**`GET /coverage/reservas-cupo/periodos-inscripciones`** — períodos del Establecimiento en estado **Inscripciones**. El primero se usa también para el badge *Período siguiente* del título.

```json
[
  { "id": "1", "sede": "IE Central", "jornada": "Mañana", "anio": 2028, "modalidad": "Anual", "ciclo": 1 }
]
```

**`POST /coverage/reservas-cupo/reservar-cupos`**

```json
{ "periodoIds": ["1", "2", "3", "4"] }
```

Qué hace el back (Sección 3.2, *Botón Reservar cupos*):

1. Toma a los estudiantes con matrícula **Cursando** en períodos **Abiertos** del Establecimiento cuyo **período de continuidad** esté entre los elegidos y ofrezca su grado siguiente.
2. Crea a cada uno la reserva con decisión *Continúa*, con la **reserva automática** de la Regla 25: grado siguiente; primero misma jornada y sede, luego las otras Jornadas de continuidad en la misma sede, luego otra sede. Nunca cambia la modalidad. Sin cupo (Sección 3.2.2) → **Sin continuidad**.
3. `asignadaPor` = el funcionario; `confirmadaPorAcudiente` según la Configuración del período (Sección 3.8).
4. **Omite** sin crear: a quien ya tiene reserva Reservada o Sin continuidad (la Liberada no cuenta), sin grado siguiente, sin período de continuidad (o que no ofrece su grado) y, en el sector No oficial, con sanción *No renovación del cupo*.
5. Es **idempotente**: se puede ejecutar varias veces y solo procesa a los que faltan.
6. Notifica al acudiente (Regla 34).

Respuesta (el resumen del modal):

```json
{
  "creadas": 164,
  "sinContinuidad": 6,
  "omitidos": {
    "total": 12,
    "conReserva": 8,
    "sinGradoSiguiente": 3,
    "sinPeriodoContinuidad": 1,
    "noRenovacion": 0
  }
}
```

### 3.4 Detalle — `GET /coverage/reservas-cupo/:id`

Responde `ReservaCupoDetalle` (§2.2). 404 si no existe o no es del alcance del usuario.

### 3.5 Asignar grupo individual (Sección 3.6, Regla 30)

**`GET /coverage/reservas-cupo/:id/grupos`** — grupos del grado, sede y jornada de la reserva con cupo:

```json
[{ "id": "702", "codigo": "702", "cuposDisponibles": 9 }]
```

Con `tipoCupo = CONTRATADO`, solo grupos con **cupo contratado libre**; en las demás, el cupo del grupo menos su cupo contratado (Regla 76).

**`GET /coverage/reservas-cupo/catalogos-acciones`** — catálogos de los modales (ver §3.10); aquí se usa `especialidades`.

**`POST /coverage/reservas-cupo/:id/asignar-grupo`**

```json
{ "id": "12", "grupoId": "702", "especialidad": "Técnica en sistemas", "mediaTecnicaExterna": false }
```

- Solo con la reserva **Reservada**, el período **Abierto** y entre la Fecha de cierre de inscripción y la Fecha límite de matrícula (Sección 3.6, *Cuándo*). Si no → 409 con el motivo.
- Crea la matrícula en **Cursando** y pasa la reserva a **Matriculada**.
- **Pendiente de acordar:** la pantalla tiene todo el formulario de matrícula (estudiante, domicilio, acudiente, soportes…), precargado y editable (Regla 8). Hoy el front **solo envía los cuatro campos de arriba**. Para guardar el resto proponemos reutilizar el contrato de creación de matrícula (`/eval-col/cobertura-academica/matricula`, multipart) con un `FK_TRESERVA` adicional, o que este endpoint acepte el mismo multipart. Definan cuál y el front lo arma.

Respuesta: `null` (204/200). El front vuelve a la lista e invalida todo.

### 3.6 Asignar grupo por lote (Sección 3.6, *Por lote*)

**`POST /coverage/reservas-cupo/grupos-lote`** — grupos con cupo para **todas** las reservas marcadas:

```json
{ "ids": ["12", "15", "31"] }
```

Responde `GrupoConCupo[]` como §3.5, filtrando los grupos con `cuposDisponibles >= ids.length` (y, si alguna es de cupo contratado, cupo contratado libre suficiente).

**`POST /coverage/reservas-cupo/asignar-grupo-lote`**

```json
{ "ids": ["12", "15", "31"], "grupoId": "702" }
```

- Todas deben ser **Reservadas** y del **mismo grado, sede y jornada** (el front ya lo valida, pero el back debe rechazar con 409).
- Pasan a Matriculada y se crean sus matrículas en Cursando, con las **asignaturas obligatorias del plan de estudio**; los datos de cada estudiante se completan después en Matrícula.
- Es **todo o nada**: si falla una, no se crea ninguna.

Respuesta: `{ "matriculadas": 3 }`.

### 3.7 Cambiar jornada o sede (Sección 3.2)

**`GET /coverage/reservas-cupo/:id/opciones-cupo`** — jornada y sede del Establecimiento con cupo disponible en el **mismo grado**, sin la actual:

```json
[{ "jornada": "Tarde", "sede": "Sede Norte" }]
```

En una reserva de origen Redistribución, solo si `tipoCupo = OFICIAL` (Sección 3.5).

**`POST /coverage/reservas-cupo/:id/cambiar-jornada-sede`**

```json
{ "id": "12", "jornada": "Tarde", "sede": "Sede Norte" }
```

- Solo Reservada; mismo grado; con cupo (si no → 409).
- **Anula la constancia de reserva vigente** (Administración del Sistema, Sección 12.4) y notifica al acudiente (Regla 34).
- Registra el cambio en el historial (`valorAnterior`: `"Mañana · IE Central"`, `valorNuevo`: `"Tarde · Sede Norte"`).

Respuesta: `null`.

### 3.8 Solicitar traslado (Secciones 3.1 y 3.2.1, Regla 31)

**`POST /coverage/reservas-cupo/:id/solicitar-traslado`** — **multipart/form-data** (lleva archivo):

| Campo | Tipo | Obligatorio | Validación |
| :--- | :--- | :---: | :--- |
| `establecimientoDestino` | string | Sí | De la lista de establecimientos de la instalación (oficiales y no oficiales, Regla 78) u `"Otro (fuera de la plataforma)"`. |
| `nombreDestino` | string | Si el destino es Otro | 3 a 150 caracteres. |
| `motivo` | string | Sí | Lista de Valores *Motivo del traslado*. |
| `jornadaSedePreferida` | string | No | |
| `tieneHermano` | `"true"`/`"false"` | Sí | |
| `documentoHermano` | string | Si `tieneHermano` | 3 a 15 dígitos. El back lo comprueba y guarda `hermanoVerificado`. |
| `compartirSoportes` | `"true"`/`"false"` | Sí | |
| `soporte` | archivo | No | PDF, JPG o PNG, máximo 10 MB. |
| `observacion` | string | No | Máximo 500. |
| `autorizaDatos` | `"true"` | Sí | Ley 1581 de 2012. |

Comportamiento:

- Solo **Reservada** sin traslado Pendiente (sí tras uno Rechazado o Cancelado: el nuevo reemplaza los datos y el anterior queda en la Bitácora). No en origen Redistribución. Si no → 409 `"La reserva ya tiene un traslado Pendiente."` u otro motivo.
- La decisión pasa a *Solicita traslado* y el **Estado del traslado a Pendiente**. El estudiante **conserva la reserva en el origen**.
- Si el destino usa la plataforma, aparece en su lista como **traslado entrante** (`trasladoEntrante = true`) y se notifica a su Administrador y Gestor (Regla 34).
- **Rol territorial** (Supervisor o Administrador territorial): además `motivoGestion` (texto, 10 a 500, obligatorio) y `soporte` obligatorio (la solicitud del acudiente). El front aún no muestra esos campos: falta su prototipo.

Respuesta: `null`.

### 3.9 Liberar manualmente y Registrar retiro (Sección 3.2)

**`POST /coverage/reservas-cupo/:id/liberar`**

```json
{ "id": "12", "motivo": "La familia desiste" }
```

- Solo Reservada o Sin continuidad, **no** en origen Redistribución.
- `motivo` solo uno de los tres manuales: *La familia desiste*, *Matriculado en otro establecimiento*, *Error de registro*. Otro → 400.
- Pasa a **Liberada** con ese motivo y deja el cupo disponible.

**`POST /coverage/reservas-cupo/:id/registrar-retiro`**

```json
{ "id": "12", "motivo": "Cambio de ciudad" }
```

- Solo Reservada o Sin continuidad. `motivo` de la Lista de Valores *Motivo de retiro*, **sin** *Traslado a otro establecimiento*.
- La decisión pasa a *Se retira* y la reserva a **Liberada** con motivo *Retiro del estudiante*.

En ambos: si había un traslado **Pendiente**, pasa a **Cancelado** y la fila sale de la lista del destino, avisando al destino (Sección 3.2.1, *Reserva del origen liberada*). Se anula la constancia vigente y se notifica al acudiente.

Respuesta: `null`.

### 3.10 Catálogos de los modales — `GET /coverage/reservas-cupo/catalogos-acciones`

```json
{
  "establecimientosDestino": ["IE San José", "IE La Esperanza", "Otro (fuera de la plataforma)"],
  "motivosTraslado": ["Cambio de residencia", "…"],
  "motivosLiberacion": ["La familia desiste", "Matriculado en otro establecimiento", "Error de registro"],
  "motivosRetiro": ["Cambio de ciudad", "…"],
  "especialidades": ["Académica", "Técnica en sistemas"],
  "jornadasSedesDestino": ["Mañana · Sede Principal", "…"]
}
```

`jornadasSedesDestino` depende del destino elegido; si el back lo prefiere, puede ser un endpoint aparte por establecimiento y el front lo pide al cambiar el destino.

### 3.11 Acciones todavía sin prototipo

El front ya muestra estos botones según el estado, pero solo dicen "próximamente": **Reservar cupo** (Sin continuidad), **Restituir** (Liberada), **Generar constancia de reserva**, **Cancelar traslado**, **Aceptar traslado** y **Rechazar traslado** (traslado entrante), y **Exportar** (PDF/Excel con los filtros). Sus reglas están en la Sección 3.2 y 3.2.1; el contrato se agregará con sus pantallas.

---

## 4. Notificaciones y Bitácora

Todo cambio de una reserva (creación, Sin continuidad, cambio de jornada o sede, liberación, retiro, traslado, matrícula) se **notifica al acudiente** por correo y en la plataforma (Regla 34) y queda en la **Bitácora** (Sección 8), de donde sale `historial` del detalle. El front no hace nada de esto: es responsabilidad del back en cada endpoint de escritura.

---

## 5. Resumen de endpoints

| Método | Ruta | Uso |
| :--- | :--- | :--- |
| POST | `/coverage/reservas-cupo/query` | Lista de reservas + contadores |
| GET | `/coverage/reservas-cupo/catalogos` | Filtros de la lista |
| GET | `/coverage/reservas-cupo/periodos-inscripciones` | Modal Reservar cupos y badge |
| POST | `/coverage/reservas-cupo/reservar-cupos` | Reservar cupos (Regla 35) |
| GET | `/coverage/reservas-cupo/catalogos-acciones` | Catálogos de los modales |
| POST | `/coverage/reservas-cupo/grupos-lote` | Grupos con cupo para el lote |
| POST | `/coverage/reservas-cupo/asignar-grupo-lote` | Asignar grupo por lote |
| GET | `/coverage/reservas-cupo/:id` | Ver detalle |
| GET | `/coverage/reservas-cupo/:id/grupos` | Grupos con cupo (individual) |
| GET | `/coverage/reservas-cupo/:id/opciones-cupo` | Jornada y sede con cupo |
| POST | `/coverage/reservas-cupo/:id/asignar-grupo` | Asignar grupo individual |
| POST | `/coverage/reservas-cupo/:id/cambiar-jornada-sede` | Cambiar jornada o sede |
| POST | `/coverage/reservas-cupo/:id/solicitar-traslado` | Solicitar traslado (multipart) |
| POST | `/coverage/reservas-cupo/:id/liberar` | Liberar manualmente |
| POST | `/coverage/reservas-cupo/:id/registrar-retiro` | Registrar retiro |

Cuidado con el orden de las rutas: las estáticas (`catalogos`, `catalogos-acciones`, `periodos-inscripciones`, `grupos-lote`, `asignar-grupo-lote`) no deben caer en `/:id`.

# Contrato back ↔ front: Inscripciones y Configuración

Este documento dice qué necesitan del backend real las pestañas **Inscripciones** y **Configuración** de la vista *Inscripción y reservas* (menú *Inscripciones*, ruta `/app/cobertura/inscritos`). Los handlers de MSW imitan las rutas reales de la §8:

- `src/mocks/handlers/inscripciones.ts`
- `src/mocks/handlers/inscripciones-configuracion.ts`

Las reglas de negocio salen de `docs/Cobertura Educativa.md`: la Sección 3.3 para Inscripciones y las Secciones 3.7 y 3.8 para Configuración. Se citan como *Sección X* o *Regla N*. La pestaña Reservas de cupo tiene su propio documento: `docs/contrato-back-reservas-cupo.md`.

---

## 1. Convenciones

Son las mismas de `contrato-back-reservas-cupo.md` §1:

- Las rutas van bajo `/api/coverage/...` y usan camelCase.
- Las lecturas con filtros van por POST, con paginación 0-based.
- Las fechas van como `yyyy-MM-dd`.
- Los estados viajan como códigos en MAYÚSCULAS.
- Los errores llevan un `message` en español para el usuario, con código 400, 404 o 409.
- Si el backend vive en eval-col, el front adapta los nombres.

Los tipos de referencia están en `src/features/coverage/inscripcion-reservas/api/types/`, en `inscripcion.ts` y `configuracion.ts`.

**Permisos (Sección 7):** admitir, no admitir, configurar y copiar son del **Administrador del establecimiento** y del **Gestor administrativo del establecimiento**.

- *Nueva inscripción*, *Editar* y *Anular* también los puede hacer un funcionario de un establecimiento de las opciones, a nombre del acudiente.
- El back valida el rol en cada endpoint.

**Listas de Valores que usa el manual:** *Estado de la inscripción*, *Estado de la opción*, *Motivo de anulación*, *Motivo de no admisión*, *Situación de edad*, *Modo del proceso* y *Desempate*.

---

## 2. Modelos

### 2.1 Opción de la lista — `OpcionInscripcion`

Cada fila de la lista es **una opción** de una inscripción en el establecimiento que consulta, no la inscripción entera (Sección 3.3, *Lista de inscripciones*).

| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | string | PK de la opción. |
| `inscripcionId` | string | PK de la inscripción. Las acciones Ver detalle, Editar y Anular trabajan sobre ella. |
| `posicion` | number | Posición en el **orden de admisión** del grado, calculada **antes** de buscar o filtrar (Regla 28). |
| `numeroInscripcion` | string | Consecutivo único en la plataforma (Regla 27), p. ej. `"00412"`. |
| `aspirante` | string | Nombre completo. |
| `documento` | string | |
| `documentosIncompletos` | boolean | Marca *Documentos incompletos* (Regla 40). Se compara contra los *Documentos requeridos para admitir* del grupo. |
| `documentosFaltantes` | string[] | Nombres de los documentos que faltan, para el texto emergente de la marca. |
| `prioridad` | string \| null | Nombre del criterio de prioridad que cumple; `null` si no cumple ninguno. |
| `numeroSorteo` | string \| null | `null` hasta que se ejecuta el sorteo. |
| `preferencia` | number | Número de la opción dentro de la inscripción (1 a 3). |
| `estadoOpcion` | `PENDIENTE` \| `EN_LISTA_ESPERA` \| `ADMITIDA` \| `NO_ADMITIDA` \| `DESCARTADA` | Sección 3.3, *Estados de la opción*. |
| `estadoInscripcion` | `INSCRITA` \| `EN_LISTA_ESPERA` \| `POR_ELEGIR` \| `ADMITIDA` \| `ANULADA` | Se **deduce** de las opciones (Sección 3.3). Falta `NO_ADMITIDA` en el front; ver §6. |
| `situacionEdad` | `EN_EDAD` \| `PREEXTRAEDAD` \| `EXTRAEDAD` \| `BAJA_EDAD` \| `SIN_CALCULAR` | Regla 39, Sección 3.7.2. |
| `totalOpciones` | number | Opciones elegidas por el acudiente. No cuentan las Descartadas ni las de redistribución. Sirve para decidir si se ofrece *Ampliar*, que exige menos de 3. |

### 2.2 Grupo de admisión del encabezado — `GrupoAdmision`

| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `id`, `anio`, `modalidad`, `ciclo` | | El front lo muestra como *Grupo: 2028 · Anual · Ciclo 1*. |
| `desempate` | `SORTEO` \| `ORDEN_INSCRIPCION` | Para la frase *"Orden de admisión: primero por prioridad y luego por…"*. |
| `fechaCierre` | string | Día del sorteo. Antes de esa fecha, *Admitir* está deshabilitado. |
| `sorteoEjecutado` | boolean | Habilita *Admitir* y *Generar lista del sorteo*. |
| `grados`, `jornadas` | string[] | Opciones de los selectores **Grado** (obligatorio) y **Jornada**. |

### 2.3 Detalle de la inscripción — `InscripcionDetalle`

| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `id`, `numeroInscripcion`, `grado`, `estado` | | `estado` es el de la inscripción. |
| `documentoHermano` | string \| null | |
| `opciones[]` | `{ preferencia, establecimiento, sede, jornada, numeroSorteo, estado, hermanoVerificado }` | Todas las opciones, de **todos** los establecimientos, ordenadas por preferencia. |
| `estudiante` | objeto | Datos de los bloques 2.2 a 2.4 que muestra el detalle (ver el tipo). Incluye `paisOrigen`, `lenguaMaterna` y `condicionMigratoria`. |
| `acudiente` | objeto | Parentesco, documento, nombres, teléfono y correo. |
| `soportes[]` | `{ id, nombre, archivo, revision }` | Bloque 2.14. `revision` es `SOPORTADO`, `SIN_REVISAR`, `SIN_ARCHIVO` o `RECHAZADO`. `archivo` trae el nombre, `"N archivos"` o `null`. |

### 2.4 Configuración — `GrupoAdmisionConfig` y `PeriodoInscripcionConfig`

Los campos están en `api/types/configuracion.ts` y siguen las tablas de las Secciones 3.7 y 3.8. Los que el back calcula y el front no edita son estos:

- **`GrupoAdmisionConfig`:**
  - `periodos`: nombres *"Sede · Jornada"* de los períodos del grupo en Inscripciones.
  - `menorFechaLimiteMatricula`: tope de la Fecha de cierre.
  - `configurado`: `false` mientras no tenga Fecha de cierre. Es la marca *Por configurar*.
  - `bloqueado`: `true` después del sorteo o de la primera admisión. Con él, criterios y desempate quedan fijos.
- **`PeriodoInscripcionConfig`:**
  - `grupoAdmision`: nombre del grupo.
  - `fechaCierreInscripcion` y `fechaLimiteMatricula`: rango permitido de la Fecha de liberación.

---

## 3. Pestaña Inscripciones

### 3.1 Grupo de admisión — `GET /coverage/inscripciones/grupo-admision`

Responde `GrupoAdmision` (§2.2): el grupo vigente del establecimiento del usuario. Si hay varios grupos, por ejemplo Anual y Semestral, hay que decidir cómo se elige; ver §6.

### 3.2 Lista — `POST /coverage/inscripciones/query`

```json
{
  "filters": { "grado": "1°", "jornada": "Mañana", "q": "mariana", "estados": ["PENDIENTE", "EN_LISTA_ESPERA"] },
  "pageIndex": 0,
  "pageSize": 10
}
```

- `grado` es **obligatorio**. Sin grado, el front no consulta.
- `jornada` es opcional; si falta, la lista trae todas las jornadas.
- `q` busca por número de inscripción, nombre o documento.
- `estados` filtra por estado de la opción. Si viene vacío, se toman `PENDIENTE` y `EN_LISTA_ESPERA`.
- Solo entran opciones **de este establecimiento**, en el **orden de admisión**: primero por prioridad, en el orden de los criterios del grupo, y luego por el desempate (número de sorteo o número de inscripción) (Sección 3.7, *Orden de admisión*).

Respuesta:

```json
{ "rows": [OpcionInscripcion], "pageCount": 2, "totalCount": 14, "cuposDisponibles": 12 }
```

- `cuposDisponibles` sale de la Sección 3.2.2 para el grado y la jornada elegidos. Sin jornada, es la suma de todas.

### 3.3 Generar lista del sorteo — `POST /coverage/inscripciones/lista-sorteo`

- Body: `{ "formato": "pdf" | "excel" }`.
- Sección 3.7, *Lista publicable*: en orden de admisión, con número de inscripción, grupo de prioridad, número de sorteo y estado de la opción, **sin datos personales**, con el escudo del establecimiento (Regla 57).
- Hoy el front espera `{ status, message }` y muestra el mensaje.
- Al conectar, conviene servir el archivo por `/reportes/<key>` con `downloadReport`, como el resto de exportaciones; ver §6.

### 3.4 Detalle — `GET /coverage/inscripciones/:id`

Responde `InscripcionDetalle` (§2.3) y 404 si no existe.

### 3.5 Nueva inscripción — `POST /coverage/inscripciones` (multipart)

Lo usan el formulario *Nueva inscripción* y `useCrearInscripcion`. Va en **multipart** por la foto del estudiante: `postMultipart` aplana el objeto en claves con punto y omite los `null`.

| Clave | Contenido |
| :--- | :--- |
| `datos.student.*`, `datos.studentAddress.*`, `datos.studentContact.*`, `datos.previousYear.*`, `datos.originSector.*`, `datos.conflictVictim.*`, `datos.complementary.*`, `datos.benefits.*`, `datos.guardian.*`, `datos.guardianAddress.*`, `datos.guardianContact.*`, `datos.guardianEmployment.*` | Los bloques 2.2 a 2.13 con **la misma forma que la matrícula** (`CreateMatriculaInput` sin `academic`). Mismas validaciones de la Sección 2. |
| `paisOrigen`, `lenguaMaterna`, `condicionMigratoria` | Campos del aspirante que el formulario de matrícula no trae. |
| `grado` | Grado de la inscripción. |
| `opciones[i].establecimiento`, `.sede`, `.jornada` | De 1 a 3, en **orden de preferencia**. |
| `foto` | Archivo, opcional. |

El back debe:

- Asignar el consecutivo y dejar la inscripción en `INSCRITA` y cada opción en `PENDIENTE`.
- Deducir el **Período Académico** de cada opción a partir de sede, jornada y modalidad.
- Validar la **Regla 27** (una inscripción vigente por aspirante por Año · Modalidad · Ciclo). Si ya hay una, responde 409 con *"El aspirante ya tiene la inscripción [número] vigente para [Año · Modalidad · Ciclo]."*
- Rechazar una combinación repetida de establecimiento, sede, jornada y modalidad.
- Comprobar el hermano (Regla 27). Si el documento no es de un estudiante con matrícula vigente en ninguno de los establecimientos de las opciones, responde 400 con el texto del manual.
- Validar el **circuito** (Regla 78).
- Enviar al acudiente el comprobante con el número (Regla 34).

Respuesta: `{ "numeroInscripcion": "00413" }`.

| `documentoHermano` | 5 a 20 letras o dígitos; ausente si no tiene hermano. |
| `autorizaDatos` | `true`, obligatorio al crear (Ley 1581). Al editar se conserva la autorización ya dada. |

> El front todavía no manda la *Modalidad de matrícula* por opción ni arma la cascada de opciones (Sección 3.3, *Cascada*): hoy usa listas fijas. Ver §6.

### 3.6 Editar inscripción — `POST /coverage/inscripciones/:id/editar` (multipart)

- Usa el mismo body de §3.5.
- Responde 409 si la inscripción está Anulada o Admitida.
- Según la Sección 3.3 (*Quitar y reordenar opciones*):
  - Una opción solo se quita si está Pendiente o En lista de espera y queda al menos otra opción.
  - No se reordena después del sorteo.
  - No se quitan opciones Admitidas ni de Redistribución.
  - Las opciones quitadas pasan a `DESCARTADA`.
- Hoy el front reenvía la lista completa de opciones. El back compara con la actual y aplica esas reglas.

### 3.7 Admitir — `POST /coverage/inscripciones/admitir`

```json
{ "ids": ["<id de opción>", "..."] }
```

- Se usa por fila o por lote (*Admitir seleccionadas*). El front envía los ids **en orden de posición**.
- El modal anticipa el resultado con `cuposDisponibles`: muestra cuántas opciones quedan Admitidas y cuántas En lista de espera. La decisión real la toma el back.

Comportamiento (Regla 28, Sección 3.3 *Admitir*):

- Solo aplica a opciones `PENDIENTE` o `EN_LISTA_ESPERA` y solo después del sorteo; antes responde 409.
- Recorre las opciones en el orden de admisión. Con cupo (Sección 3.2.2), la opción pasa a `ADMITIDA` y se crea su **reserva de cupo**, con origen `INSCRIPCION` y estado Reservada. El cupo se descuenta antes de pasar a la siguiente.
- Sin cupo, la opción pasa a `EN_LISTA_ESPERA`.
- Si el aspirante tiene varias opciones en el mismo establecimiento, se busca cupo en ellas por orden de preferencia.
- Si la inscripción queda con dos o más opciones Admitidas, pasa a `POR_ELEGIR` (Regla 38): el acudiente tiene 24 h para elegir y se le notifica.

Respuesta: `{ "admitidas": 3, "enListaEspera": 0 }`. El front la usa para el aviso final.

> El mock simplifica: al admitir una opción descarta las demás de la inscripción. Según el manual eso **no** pasa al admitir: pasa al **elegir** (Regla 38). El back debe seguir el manual.

### 3.8 No admitir — `POST /coverage/inscripciones/no-admitir`

```json
{ "ids": ["..."], "motivo": "Documentación incompleta" }
```

- `motivo` es obligatorio y uno solo para todo el lote (Lista de Valores *Motivo de no admisión*). Si los motivos son distintos, se hace en lotes separados. Sin motivo, responde 400.
- Las opciones `PENDIENTE` o `EN_LISTA_ESPERA` pasan a `NO_ADMITIDA`.
- Si alguna tiene *Documentos incompletos*, el modal avisa *"La falta de documentos no impide la matrícula. ¿Desea no admitir de todos modos?"* (Regla 40). En ese caso el motivo arranca en *Documentación incompleta*.
- Hoy el front usa una lista fija de motivos; al conectar, debe venir de la Lista de Valores.

### 3.9 Anular — `POST /coverage/inscripciones/:id/anular`

```json
{ "motivo": "La familia desiste" }
```

- El motivo es obligatorio (Lista de Valores *Motivo de anulación*).
- Todas las opciones pasan a `DESCARTADA` y la inscripción a `ANULADA`.
- Sus reservas, si las hay, pasan a Liberada con motivo *La familia desiste*.
- Se notifica al acudiente.
- Hoy el front usa una lista fija de motivos; al conectar, debe venir de la Lista de Valores.

### 3.10 Ampliar inscripción y Elegir opción

Sin prototipo: se hicieron con el texto del manual.

- **Ampliar** (Regla 27) — `POST /:ID/ampliar` con `PERIODO!` y `GRADO!`.
  - Solo Inscrita o En lista de espera, con menos de tres opciones elegidas, del mismo grado y antes del cierre o del sorteo del grupo de la opción.
  - La opción nace Pendiente al final del orden de preferencia; se recalcula el hermano.
  - El modal pide establecimiento, sede y jornada con la misma cascada de Nueva inscripción.
- **Elegir opción / Quedarme con esta opción** (Regla 38) — `POST /opciones/:ID/elegir`.
  - La opción debe estar Admitida; las demás Admitidas, Pendientes y En lista de espera pasan a Descartada y la inscripción queda Admitida.
  - Vencidas las 24 h de Por elegir, `fn_inscripcion_eleccion_vencer_interno` se queda con la Admitida de mayor preferencia. Falta el trabajo programado que la llame.

*Revisar soporte* y *Cargar soporte* (bloque 2.14) siguen en "próximamente".

---

## 4. Pestaña Configuración

### 4.1 Grupos de admisión (Sección 3.7)

| Método | Ruta | Body / respuesta |
| :--- | :--- | :--- |
| GET | `/coverage/inscripciones/configuracion/grupos` | `GrupoAdmisionConfig[]`, con los grupos del establecimiento. |
| GET | `/coverage/inscripciones/configuracion/grupos/:id` | `GrupoAdmisionConfig`. |
| PUT | `/coverage/inscripciones/configuracion/grupos/:id` | Body `{ fechaCierre, modoAdmision, criterios, desempate, documentosRequeridos }`. Responde `null`. |
| GET | `/coverage/inscripciones/configuracion/catalogos` | `{ criterios: [{id, nombre}], documentos: [{id, nombre}] }`. |

Sobre el catálogo:

- `criterios` trae solo los **activos** de la entidad *Criterios de prioridad* (Administración del Sistema, Regla 37).
- `documentos` trae los tres soportes de la Sección 3.7.

Validaciones del PUT:

- `fechaCierre` es obligatoria y no puede ser posterior a `menorFechaLimiteMatricula` (400). Mínimo: la fecha actual.
- `criterios` va **ordenado**: el orden es la prioridad.
- Con `bloqueado` (después del sorteo o de la primera admisión), un cambio de `criterios` o `desempate` responde 409 con *"Después del sorteo o de la primera admisión ya no se cambian los criterios ni el desempate."*
- Con los períodos ya Abiertos, tampoco se cambian el modo ni los documentos. La Fecha de cierre se puede ajustar mientras no haya pasado (Sección 3.7, *Cambios*).
- `configurado` pasa a `true` cuando hay Fecha de cierre.
- El cambio se propaga a `fechaCierreInscripcion` de los períodos del grupo.

Además, el back se encarga de:

- La **agrupación automática**: un período que entra a Inscripciones se une a su grupo, o crea el grupo con los valores por defecto.
- El **sorteo**: se ejecuta en la Fecha de cierre y su semilla queda en la Bitácora.
- La **admisión automática** con Modo `AUTOMATICA`.

### 4.2 Períodos académicos (Sección 3.8)

| Método | Ruta | Body / respuesta |
| :--- | :--- | :--- |
| GET | `/coverage/inscripciones/configuracion/periodos` | `PeriodoInscripcionConfig[]`, con los períodos en Inscripciones. |
| GET | `/coverage/inscripciones/configuracion/periodos/:id` | `PeriodoInscripcionConfig`. |
| PUT | `/coverage/inscripciones/configuracion/periodos/:id` | Body `{ fechaLiberacionReservas, modoTraslado, plazoRespuestaTraslado, requiereConfirmacionAcudiente }`. Responde `null`. |
| POST | `/coverage/inscripciones/configuracion/periodos/:id/copiar` | Body `{ destinos: [id, ...] }`. |

Validaciones del PUT:

- `fechaLiberacionReservas` es opcional y, si viene, debe estar entre `fechaCierreInscripcion` y `fechaLimiteMatricula` (400).
- `plazoRespuestaTraslado` es un entero de 1 a 60.
- Con el período Abierto ya no se cambian el modo, el plazo ni la confirmación.

**Copiar configuración** (Sección 3.8):

- Copia los cuatro valores del período de la ruta (el origen) a cada destino. No copia la Fecha límite de matrícula.
- En cada destino se revisan las validaciones de fechas.
- Responde **qué destinos se copiaron y cuáles no, con el motivo**. El front arma el texto *"La configuración no se copió a [Período] porque [motivo]."*, así que `motivo` va en minúscula y sin punto final:

```json
{
  "copiados": [{ "id": "2", "periodo": "IE Central · 2027 · Tarde · Anual" }],
  "noCopiados": [{ "id": "4", "periodo": "IE Central · 2027 · Nocturna · Semestral", "motivo": "la Fecha de liberación es anterior a su cierre de inscripción" }]
}
```

- Si todo se copió, el front muestra un aviso y cierra. Si algún destino falló, muestra el **modal de resultado**: los períodos copiados y un aviso por cada uno no copiado.
- Un destino que no pasa la validación de fechas **no se copia en nada**. El mock hace lo mismo.

---

## 5. Notificaciones y Bitácora

- Se **notifica al acudiente** (Regla 34) al registrar la inscripción (comprobante), al ampliarla, al editar sus opciones, al admitir (reserva creada), al pasar a Por elegir, al no admitir y al anular.
- Todo cambio de una inscripción, de una opción y de las dos configuraciones queda en la **Bitácora** (Sección 8), incluida la semilla del sorteo.
- El back lo hace en cada endpoint de escritura; el front no interviene.

---

## 6. Diferencias abiertas entre el front y el manual

| # | Qué | Dónde | Qué falta |
| :-: | :--- | :--- | :--- |
| 1 | Campos de la inscripción | *Nueva* y *Editar inscripción* | Hermano y autorización ya están. Faltan la *Modalidad de matrícula* por opción y la cascada de opciones con catálogos reales. Hoy son listas fijas. |
| 2 | Estado `NO_ADMITIDA` de la inscripción | Tipos y etiquetas | Agregarlo a `EstadoInscripcion`. El back ya lo deduce. |
| 3 | Varios grupos de admisión | Encabezado de Inscripciones | Resuelto: con más de un grupo, el encabezado muestra un selector (`?inscGrupo=`). Los grados salen de los períodos del grupo. |
| 4 | Lista del sorteo | *Generar lista del sorteo* | Resuelto: usa `downloadReport("inscripcion-lista-sorteo")`. |
| 5 | Catálogos fijos | País, lengua y condición migratoria; sedes de las opciones | Los motivos ya vienen de la Lista de Valores y viajan como `FK_TLV_MOTIVO`. |
| 6 | Reserva al admitir | Admitir | El back no crea la reserva de cupo todavía (fuera de alcance). |

---

## 7. Resumen de endpoints

| Método | Ruta | Uso |
| :--- | :--- | :--- |
| GET | `/coverage/inscripciones/grupo-admision` | Encabezado de la pestaña |
| POST | `/coverage/inscripciones/query` | Lista de opciones y cupos |
| POST | `/coverage/inscripciones/lista-sorteo` | Lista publicable del sorteo |
| POST | `/coverage/inscripciones` | Nueva inscripción (multipart) |
| POST | `/coverage/inscripciones/admitir` | Admitir (fila o lote) |
| POST | `/coverage/inscripciones/no-admitir` | No admitir (fila o lote) |
| GET | `/coverage/inscripciones/:id` | Ver detalle |
| POST | `/coverage/inscripciones/:id/editar` | Editar (multipart) |
| POST | `/coverage/inscripciones/:id/anular` | Anular |
| GET | `/coverage/inscripciones/configuracion/catalogos` | Criterios y documentos |
| GET | `/coverage/inscripciones/configuracion/grupos` | Lista de grupos de admisión |
| GET / PUT | `/coverage/inscripciones/configuracion/grupos/:id` | Ver y modificar un grupo |
| GET | `/coverage/inscripciones/configuracion/periodos` | Lista de períodos |
| GET / PUT | `/coverage/inscripciones/configuracion/periodos/:id` | Ver y modificar un período |
| POST | `/coverage/inscripciones/configuracion/periodos/:id/copiar` | Copiar configuración |

Cuidado con el orden de las rutas: `grupo-admision`, `query`, `lista-sorteo`, `admitir`, `no-admitir` y `configuracion/...` no deben caer en `/:id`.

---

## 8. Back real (SSO, `V426__inscripciones_endpoints.sql`)

Todas las rutas van bajo `/cobertura-academica/inscripciones`. Las claves son las de `public.query`; `!` es obligatorio. Escriben Rector y Auxiliar administrativo; el Superadministrador solo lee.

| Front (mock) | Back real | Claves |
| :--- | :--- | :--- |
| `GET grupo-admision` | `GET /configuracion/establecimiento/:ID/grupos` | Ver §6 #3. |
| `POST query` | `POST /query` | `FK_TESTABLECIMIENTO!`, `FK_TGRUPO_ADMISION!`, `FILTERS.GRADO!`, `FILTERS.JORNADA`, `FILTERS.SEARCH`, `FILTERS.ESTADOS[]`, `PAGEINDEX`, `PAGESIZE` |
| `GET :id` | `GET /:ID` | |
| `POST /` (multipart) | `POST /` | `FK_TUSUARIO_ESTUDIANTE!`, `FK_TUSUARIO_ACUDIENTE!` (el back crea TESTUDIANTE y TPADRE si faltan), `FK_TLV_PARENTESCO`, `DOCUMENTO_HERMANO`, `FK_ARCHIVO_FOTO` (`FILE:matricula`), `PAIS_ORIGEN`, `LENGUA_MATERNA`, `CONDICION_MIGRATORIA`, `OPCIONES!` (JSONB), `AUTORIZA_DATOS!` |
| `POST :id/editar` | `POST /:ID/editar` | Las mismas sin estudiante ni autorización; `OPCIONES!` |
| `POST :id/anular` | `POST /:ID/anular` | `FK_TLV_MOTIVO!` |
| `POST admitir` | `POST /admitir` | `IDS[]`. Responde `{ admitidas, enListaEspera, omitidas }`. |
| `POST no-admitir` | `POST /no-admitir` | `IDS[]`, `FK_TLV_MOTIVO!` |
| `GET configuracion/catalogos` | `GET /configuracion/catalogos/:ID` | `:ID` es el establecimiento. |
| `GET configuracion/grupos` | `GET /configuracion/establecimiento/:ID/grupos` | |
| `GET/PUT configuracion/grupos/:id` | `GET/PUT /configuracion/grupos/:ID` | PUT: `FECHA_CIERRE!`, `MODO_ADMISION!`, `CRITERIOS[]`, `DESEMPATE!`, `DOCUMENTOS[]` |
| `POST sorteo` | `POST /configuracion/grupos/:ID/sorteo` | La semilla la genera el back. |
| `GET configuracion/periodos` | `GET /configuracion/establecimiento/:ID/periodos` | |
| `GET/PUT configuracion/periodos/:id` | `GET/PUT /configuracion/periodos/:ID` | PUT: `FECHA_LIBERACION_RESERVAS`, `MODO_TRASLADO!`, `PLAZO_RESPUESTA_TRASLADO!` (1–60), `REQUIERE_CONFIRMACION_ACUDIENTE!` |
| `POST configuracion/periodos/:id/copiar` | `POST /configuracion/periodos/:ID/copiar` | `DESTINOS[]` |
| sedes del usuario | `GET /opciones-cupo` | Cascada de Nueva inscripción y Ampliar: períodos en Inscripciones de todos los establecimientos que aún reciben opciones, con sus grados. INSCRITOS/CREAR. |
| — | `POST /:ID/ampliar` | `PERIODO!`, `GRADO!`. Devuelve el id de la opción. |
| — | `POST /opciones/:ID/elegir` | Devuelve la inscripción. |
| — | `POST /configuracion/periodos/:ID/habilitar` | Pasa el período a Inscripciones. Sin pantalla aún. |
| `POST lista-sorteo/datos` | `POST /lista-sorteo/datos` | `FK_TGRUPO_ADMISION!`, `GRADO!`, `JORNADA` |
| `downloadReport` | `POST /lista-sorteo/reporte` | `FILTERS.FK_TGRUPO_ADMISION!`, `FILTERS.GRADO!`, `FILTERS.JORNADA`; key `inscripcion-lista-sorteo`, solo PDF. |

El front tiene un solo camino: los hooks llaman a estas rutas y los handlers de MSW (`mocks/handlers/inscripciones*.ts`) las imitan con la misma forma. `src/mocks/handlers/inscripciones.test.ts` cubre ese contrato.

- Aspirante y acudiente se buscan por documento o se registran como en la matrícula.
- Cada opción (sede y jornada por nombre) se resuelve a `{periodo, grado}` con `periodos/resolver-matricula` y los grados del período. Solo sirve para sedes del usuario: falta la cascada con todos los establecimientos.
- La foto viaja como `FK_ARCHIVO_FOTO` y file-service la cambia por su `pk_tarchivo`.
- El detalle trae `estudiante` y `acudiente` desde `TUSUARIO`. Lugar de expedición, lugar de nacimiento y etnia quedan vacíos.

### Tareas programadas

`TareasInscripciones` (query-service) llama cada 5 minutos a `fn_inscripcion_tareas_programadas_interno`, solo en la instancia `eval-col`. Se configura con `query.tareas.inscripciones.enabled`, `.instancia` e `.intervalo-ms`. Un candado de la base evita dos corridas a la vez.

En cada corrida:

1. Hace el sorteo de los grupos que desempatan por sorteo y ya llegaron a su Fecha de cierre.
2. Cierra la lista de espera cuando vence la Fecha límite de matrícula: las opciones En lista de espera pasan a No admitida con motivo *Sin cupo*, y las Pendientes con motivo *Sin evaluar*. Esos dos motivos son de sistema y no se ofrecen en el modal.
3. Hace la admisión automática en los grupos con Modo Automática: admite las Pendientes al cierre y reasigna los cupos que se liberan a la lista de espera. Omite las opciones con documentos incompletos.
4. Resuelve las elecciones vencidas (24 h).

La situación de edad del listado (`situacion_edad`) sale de `fn_situacion_edad` (V309), con los Parámetros de edad, el calendario del establecimiento y el año lectivo del período.

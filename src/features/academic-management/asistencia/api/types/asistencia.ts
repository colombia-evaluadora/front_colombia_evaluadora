// Tipos del contrato real de `SSO - Asistencias` (CU-86e32gvpp, V220/V221).
// `estado_sesion` informa si la asistencia SE TOMÓ (no cómo asistieron los
// alumnos): REGISTRADA = hay registro, RETRASADA = fecha <= hoy sin
// registro, PENDIENTE = fecha futura sin registro.
export type EstadoSesion = "REGISTRADA" | "RETRASADA" | "PENDIENTE"

// Catálogo `TLISTA_VALOR` categoría `TIPO_ASISTENCIA` — el valor 4 no
// existe, por eso el union salta de 3 a 5.
export type TipoAsistencia = 1 | 2 | 3 | 5 | 6

export interface SesionCalendario {
  fecha: string
  bloque: number
  fk_grupo: number
  grupo: string
  // GAP DE CONTRATO: `fn_asistencia_calendario` (V220) no confirma este
  // campo -- el grupo tiene jornada como atributo propio (no se deriva de
  // nada más en esta respuesta), así que hace falta que el backend lo
  // agregue acá, o el front lo resuelve aparte uniendo por `fk_grupo`
  // contra el catálogo real de grupos (`fn_grupo_listar`, Períodos
  // Académicos). Se necesita para diferenciar sedes con más de una jornada
  // -- ver `AsistenciaMonthGrid`/`AsistenciaDayCellRectorPopover`.
  jornada: string
  fk_asignatura: number
  asignatura: string
  // TIMESTAMP -- confirmado contra `fn_asistencia_calendario` (V220): trae
  // fecha Y hora, aunque el bloque de horario en sí sea solo un rango de
  // horas del día (mismo dato repetido para cualquier fecha de ese bloque).
  hora_inicio: string | null
  hora_fin: string | null
  estado_sesion: EstadoSesion
  total_estudiantes: number
  a_tiempo: number
  tarde: number
  ausentes: number
  horas: number
}

export interface AsistenciaCalendarioParams {
  SEDE: number
  ANIO: number
  MES: number
  GRUPO?: number
  ASIGNATURA?: number
}

export interface ResumenHoras {
  horas_semana: number
  horas_mes: number
  horas_anio: number
  horas_efectivas_mes: number
  registradas_mes: number
  retrasadas_mes: number
  pendientes_mes: number
}

export interface AsistenciaResumenHorasParams {
  SEDE: number
  FECHA: string
  GRUPO?: number
  ASIGNATURA?: number
}

// Tipos de los endpoints de escritura (registrar, PATCH) y de "Asistencia
// manual" (registro individual por estudiante, abierta desde el popover del
// calendario). Contrato real confirmado contra `fn_asistencia_registrar_bulk`
// / `fn_asistencia_listar_seguimiento` (V220/V221, rama CU-86e32gvpp).
// `fkArchivo` viaja como `File` cuando el registro se manda desde "Asistencia
// manual" (soporte recién adjuntado, sin subir todavía) -- ver
// `postMultipart`/`toMultipart` en `lib/files.ts`: `file-service` intercepta
// el multipart, sube el binario y reemplaza el campo por el `pk_tarchivo`
// antes de reenviar el JSON a `fn_asistencia_registrar_bulk`.
export interface AsistenciaRegistroManual {
  fkMatricula: number
  tipoAsistencia: TipoAsistencia
  observacion?: string
  fkArchivo?: number | File
}

// MOCK-ONLY: "estudiantes de un grupo" no tiene endpoint real confirmado
// todavía (ver nota en `mocks/db/asistencia/asistencia.ts`).
export interface RosterEstudiante {
  fkMatricula: number
  nombre: string
}

export interface AsistenciaRegistrarRequest {
  GRUPO: number
  ASIGNATURA: number
  FECHA: string
  BLOQUE: number
  REGISTROS?: AsistenciaRegistroManual[]
  MARCAR_TODOS?: TipoAsistencia
}

// `PATCH /eval-col/asistencias/:ID` (fn_asistencia_editar, V221) -- edita UN
// registro desde "Seguimiento". Campos ausentes = no se tocan; los flags
// LIMPIAR_* son la única forma de poner OBSERVACION/soporte en NULL (un
// campo ausente no basta, "ausente" significa "no tocar").
export interface AsistenciaEditarRequest {
  TIPO_ASISTENCIA?: TipoAsistencia
  OBSERVACION?: string
  SOPORTE_ARCHIVO?: number
  LIMPIAR_ARCHIVO?: boolean
  LIMPIAR_OBSERVACION?: boolean
}

// ── Seguimiento (POST /eval-col/asistencias/query) ─────────────────────────
// Nombres de bind calcados de /referentes-curriculares/query (V214): un
// `FILTERS` anidado + `SORTING.{ID,DESC}` + `PAGEINDEX`/`PAGESIZE` planos —
// a diferencia de matrícula (V200), que SÍ tuvo que aplanarse porque el
// motor de queries no soporta anidar ni indexar arrays (ver
// `use-matricula-query.ts`). Acá el backend ya declaró el bind anidado él
// mismo (`:BODY.FILTERS.x` / `:BODY.SORTING.ID`), así que el front no
// necesita aplanar nada.
export interface AsistenciaQueryFilters {
  FECHA_DESDE?: string | null
  FECHA_HASTA?: string | null
  GRUPO?: number | null
  ASIGNATURA?: number | null
  TIPO_ASISTENCIA?: TipoAsistencia | null
  SEARCH?: string | null
  // GAP DE CONTRATO: ninguno de los dos está en la colección Postman de
  // `fn_asistencia_listar_seguimiento` (V221) -- se agregan acá porque la
  // pantalla los necesita (ver `SeguimientoPage`), pero falta confirmarlos
  // contra el backend real (o filtrarlos client-side si no llegan a
  // agregarse ahí).
  JORNADA?: string | null
  GRADO?: string | null
}

export interface AsistenciaQueryRequest {
  FILTERS: AsistenciaQueryFilters
  SORTING: { ID: string | null; DESC: boolean | null }
  PAGEINDEX: number
  PAGESIZE: number
}

// Fila cruda tal como la devuelve fn_asistencia_listar_seguimiento.
// `total_estudiantes`/`ausentes`/`total_count` son ventanas sobre el set
// filtrado COMPLETO (no de la página) — alimentan las 3 cards de resumen sin
// pedir un endpoint aparte. `ausentes` cuenta estudiantes distintos, no
// registros.
export interface AsistenciaQueryRow {
  pk_tasistencia: number
  estudiante: string
  documento: string
  grupo: string
  // Mismo gap que en `SesionCalendario.jornada` -- ver esa nota.
  jornada: string
  asignatura: string
  fecha: string
  bloque: number | null
  hora_inicio: string | null
  hora_fin: string | null
  tipo_asistencia_valor: TipoAsistencia
  tipo_asistencia: string
  observacion: string | null
  tiene_soporte: boolean
  fk_soporte_archivo: number | null
  soporte_nombre: string | null
  total_estudiantes: number
  ausentes: number
  total_count: number
}

// Estado de los 5 selects del panel de filtros de "Seguimiento" ("" =
// "Todos"/sin elegir). Jornada/Grado/Grupo/Asignatura se aplican en
// conjunto -- ver la validación en `SearchSeguimiento` -- Tipo de
// asistencia es independiente de esa cadena.
export interface SeguimientoFiltersValues {
  jornada: string
  grado: string
  grupo: string
  asignatura: string
  tipoAsistencia: string
}

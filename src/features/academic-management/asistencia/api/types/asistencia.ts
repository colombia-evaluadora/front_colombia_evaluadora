export type EstadoSesion = "REGISTRADA" | "RETRASADA" | "PENDIENTE"


export type TipoAsistencia = 1 | 2 | 3 | 5 | 6

export interface SesionCalendario {
  fecha: string
  bloque: number | null
  fk_grupo: number
  grupo: string
  grado: string
  grado_nombre: string
  jornada: string
  jornada_nombre: string
  fk_asignatura: number
  asignatura: string
  es_formativa: boolean
  fk_tactividad: number | null
  actividad: string | null
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

export interface AsistenciaRegistroManual {
  fkMatricula: number
  tipoAsistencia: TipoAsistencia
  observacion?: string
  fkArchivo?: number | File
}

/** Padrón de una sesión: `ASIGNATURA` (+ `BLOQUE` opcional) para un grupo normal, o `ACTIVIDAD` para uno formativo -- nunca ambos. */
export interface AsistenciaSesionEstudiantesParams {
  GRUPO: number
  ASIGNATURA?: number
  ACTIVIDAD?: number
  FECHA: string
  BLOQUE?: number | null
}

export interface RosterEstudiante {
  fk_tmatricula: number
  fk_testudiante: number
  estudiante: string
  documento: string
  pk_tasistencia: number | null
  tipo_asistencia_valor: TipoAsistencia | null
  tipo_asistencia: string | null
  observacion: string | null
  fk_soporte_archivo: number | null
  soporte_nombre: string | null
  hora_inicio: string | null
  hora_fin: string | null
  fk_tperiodo_evaluacion: number | null
  total_estudiantes: number
  registrados: number
}

/**
 * `ASIGNATURA` (+ `BLOQUE`, sesión por horario) o `ACTIVIDAD` (sesión
 * formativa, sin `BLOQUE`) -- exactamente una de las dos; la función rechaza
 * con 409 si faltan ambas (`CK_TASISTENCIA_CONTEXTO`).
 */
export interface AsistenciaRegistrarRequest {
  GRUPO: number
  ASIGNATURA?: number
  ACTIVIDAD?: number
  FECHA: string
  BLOQUE?: number | null
  REGISTROS?: AsistenciaRegistroManual[]
  MARCAR_TODOS?: TipoAsistencia
}

export interface AsistenciaEditarRequest {
  TIPO_ASISTENCIA?: TipoAsistencia
  OBSERVACION?: string
  SOPORTE_ARCHIVO?: number
  LIMPIAR_ARCHIVO?: boolean
  LIMPIAR_OBSERVACION?: boolean
}

export interface AsistenciaQueryFilters {
  FECHA_DESDE?: string | null
  FECHA_HASTA?: string | null
  GRUPO?: number | null
  ASIGNATURA?: number | null
  /** Formativo (preescolar): filtra por actividad -- `ASIGNATURA` no encuentra estas filas (`FK_TASIGNATURA` queda `NULL`). */
  ACTIVIDAD?: number | null
  TIPO_ASISTENCIA?: TipoAsistencia | null
  SEARCH?: string | null
}

export interface AsistenciaQueryRequest {
  FILTERS: AsistenciaQueryFilters
  SORTING: { ID: string | null; DESC: boolean | null }
  PAGEINDEX: number
  PAGESIZE: number
}

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
  tarde: number
  total_count: number
  /** Formativo (preescolar): la fila es de una actividad, no de `asignatura` (que llega `""`/dueña, no la sesión). */
  es_formativa: boolean
  fk_tactividad: number | null
  actividad: string | null
}


export interface SeguimientoFiltersValues {
  fechaDesde: string
  fechaHasta: string
  jornada: string
  grado: string
  grupo: string
  asignatura: string
  actividad: string
  tipoAsistencia: string
}

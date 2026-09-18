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
  /** "Mis clases": el backend resuelve el docente desde el token y acota por
   *  `TDOCENTE_ASIGNATURA`. Sin esto, lo único que filtra es el alcance del
   *  rol -- para un docente, toda su sede. */
  MIAS?: boolean
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
  /** Ver `AsistenciaCalendarioParams.MIAS`. */
  MIAS?: boolean
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
  /** Acota al alcance de la sede elegida; el permiso por rol lo resuelve el backend aparte. */
  SEDE?: number | null
  GRUPO?: number | null
  ASIGNATURA?: number | null
  /** Formativo (preescolar): filtra por actividad -- `ASIGNATURA` no encuentra estas filas (`FK_TASIGNATURA` queda `NULL`). */
  ACTIVIDAD?: number | null
  TIPO_ASISTENCIA?: TipoAsistencia | null
  SEARCH?: string | null
  /** NOMBRE de la jornada, tal como lo devuelve el calendario -- no el pk ni el VALOR. */
  JORNADA?: string | null
  /** NOMBRE del grado, tal como lo devuelve el calendario. */
  GRADO?: string | null
}

export interface AsistenciaQueryRequest {
  FILTERS: AsistenciaQueryFilters
  SORTING: { ID: string | null; DESC: boolean | null }
  PAGEINDEX: number
  PAGESIZE: number
}

export interface AsistenciaQueryRow {
  /** Primer registro de la corrida -- clave de fila; para editar se usan `pks`. */
  pk_tasistencia: number
  /** Todos los registros que colapsaron en esta fila (bloques consecutivos de la misma asignatura). */
  pks: number[]
  registros: number
  bloques: number[]
  /** Bloques que llevan el estado de la fila -- todos si la corrida entera lo comparte. */
  bloques_estado: number[]
  hora_inicio_estado: string | null
  hora_fin_estado: string | null
  estudiante: string
  documento: string
  grupo: string
  /** NOMBRE de TGRADO ("Segundo"); `grado_valor` es el CODIGO ("2"), que es lo que se pinta. */
  grado: string
  grado_valor: string
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
  // Las 4 cuentan estudiantes distintos del set filtrado completo, no de la página,
  // y no suman entre sí: un estudiante puede asistir a una sesión y faltar a otra.
  total_estudiantes: number
  asistieron: number
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
  tipoAsistencia: string
}

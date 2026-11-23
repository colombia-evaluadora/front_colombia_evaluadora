import type { EstadoClaseBackend } from "@/features/academic-management/asistencia/api/types/asistencia"

/** Tipos de la planilla diaria: 1 Asistió, 2 No asistió, 5 Llegó tarde (Regla 115). */
export type TipoAsistenciaDiaria = 1 | 2 | 5

/** Fila de `GET /asistencias/diaria/calendario` (sso V747): una por día hábil y grupo Diaria. */
export interface DiariaCalendarioRow {
  fecha: string
  fk_tgrupo: number
  grupo: string
  fk_tgrado: number
  grado: string
  /** Código del grado («6»), para el rótulo «6°A». */
  grado_valor?: string | null
  fk_tlv_jornada: number | null
  jornada: string | null
  total_estudiantes: number
  registrados: number
  estado_sesion: EstadoClaseBackend
  vencida: boolean
}

export interface DiariaCalendarioParams {
  SEDE: number
  ANIO: number
  MES: number
  HOY?: string
}

/** Fila de `GET /asistencias/diaria/planilla` (sso V747): una por matrícula activa. */
export interface DiariaPlanillaRow {
  fk_tmatricula: number
  estudiante: string
  documento: string
  pk_tasistencia_diaria: number | null
  tipo_asistencia_valor: TipoAsistenciaDiaria | null
  tipo_asistencia: string | null
  bloque_llegada: number | null
  observacion: string | null
  fk_soporte_archivo: number | null
  soporte_nombre: string | null
  justificacion: string | null
  fk_tlv_fuente_justificacion: number | null
  fuente_justificacion: string | null
  sancion: string | null
  pk_tsolicitud_aprobacion: number | null
  cambio_tipo_asistencia_valor: TipoAsistenciaDiaria | null
  total_estudiantes: number
  registrados: number
  periodo_calificable: boolean
  fk_tperiodo_evaluacion: number | null
}

export interface DiariaPlanillaParams {
  GRUPO: number
  FECHA: string
}

/** Fila de `GET /asistencias/diaria/bloques`: el horario del grupo ese día. */
export interface DiariaBloqueRow {
  bloque: number
  fk_tasignatura: number
  asignatura: string
  hora_inicio: string | null
  hora_fin: string | null
  primer_bloque_clase: boolean
}

/** Un estudiante de `REGISTROS` en `POST /asistencias/diaria/registrar`. */
export interface DiariaRegistro {
  fkMatricula: number
  tipoAsistencia: TipoAsistenciaDiaria
  bloqueLlegada?: number | null
  observacion?: string | null
  fkArchivo?: number | null
  /** Solo si se envía; `null` la quita. */
  justificacion?: string | null
  fkFuenteJustificacion?: number | null
}

export interface DiariaRegistrarRequest {
  GRUPO: number
  FECHA: string
  REGISTROS?: DiariaRegistro[]
  MARCAR_TODOS?: TipoAsistenciaDiaria
  /** Regla 77: obligatorio con el período No calificable. */
  MOTIVO?: string
}

export interface DiariaRegistrarResultado {
  registrados: number
  actividades_no_asistido: number
  solicitud: boolean
  solicitudes_pendientes: number[]
}

/** Fila de `GET /asistencias/diaria/por-grupo`: una por (día, estudiante). */
export interface DiariaPorGrupoRow {
  fecha: string
  dia_registrado: boolean
  fk_tmatricula: number
  estudiante: string
  documento: string
  tipo_valor: TipoAsistenciaDiaria | null
  justificada: boolean
  en_grupo: boolean
  bloque_llegada: number | null
}

export type ModoAsistencia = "POR_CLASE" | "DIARIA"

/** `GET|PATCH /grupos/:ID/modo-asistencia` (Regla 117). */
export interface ModoAsistenciaGrupo {
  modo: ModoAsistencia
  modo_nombre: string | null
  bloqueado: boolean
  motivo: string | null
}

/** Fila de `GET /asistencias/diaria/grupos`: grupos Diaria que el usuario consulta. */
export interface DiariaGrupoRow {
  fk_tgrupo: number
  grupo: string
  fk_tgrado: number
  grado: string
  grado_valor: string | null
  fk_tlv_jornada: number | null
  jornada: string | null
  /** Docente: false y solo sus asignaturas; Responsable de grupo o nivel ≤ 2: true y todas. */
  puede_registrar: boolean
  asignaturas: { fk_tasignatura: number; asignatura: string }[]
}

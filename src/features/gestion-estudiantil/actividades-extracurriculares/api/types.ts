// Contrato de Actividades extracurriculares y Servicio social (V617-V623). Las columnas son las del backend
// (snake_case); los binds de entrada van en MAYÚSCULAS, tal cual los espera query-service.

export type EstadoActividad = "ACTIVA" | "INACTIVA"
export type EstadoServicioSocial = "CUMPLIDO" | "EN_CURSO"

export const TIPO_SERVICIO_SOCIAL = "SERVICIO_SOCIAL"

export interface ResultadoEscritura {
  id: number
}

export interface ActividadRow {
  id: number
  nombre: string
  fk_tlv_tipo: number
  tipo_valor: string
  tipo_nombre: string
  descripcion: string | null
  fk_tfuncionario_responsable: number
  responsable_nombre: string
  fk_tperiodo_academico: number
  periodo_nombre: string | null
  fk_tsede: number
  sede_nombre: string
  fk_tlv_jornada: number
  jornada_nombre: string
  fecha_inicio: string
  fecha_fin: string
  horario: string | null
  grados_texto: string | null
  inscritos: number
  cupo: number | null
  registra_asistencia: boolean
  entidad_externa: string | null
  supervisor_externo: string | null
  esta_activa: boolean
  puede_editar: boolean
  puede_inscribir: boolean
  total_count: number
}

export interface GradoActividad {
  pk: number
  nombre: string
}

export interface ActividadDetalle extends Omit<ActividadRow, "total_count"> {
  grados: GradoActividad[]
}

export interface ActividadesFiltros {
  sede: string
  jornada: string
  tipo: string
  responsable: string
  estado: string
}

export const ACTIVIDADES_FILTROS_VACIOS: ActividadesFiltros = {
  sede: "",
  jornada: "",
  tipo: "",
  responsable: "",
  estado: "",
}

export interface ActividadesQueryFilters {
  SEDE: number | null
  JORNADA: number | null
  TIPO: number | null
  RESPONSABLE: number | null
  ESTADO: string | null
  SEARCH: string | null
}

export interface ServicioSocialFiltros {
  sede: string
  jornada: string
  grado: string
  estado: string
}

export const SERVICIO_SOCIAL_FILTROS_VACIOS: ServicioSocialFiltros = {
  sede: "",
  jornada: "",
  grado: "",
  estado: "",
}

export interface ServicioSocialQueryFilters {
  SEDE: number | null
  JORNADA: number | null
  GRADO: number | null
  ESTADO: string | null
  SEARCH: string | null
}

export interface OpcionResponsable {
  id: number
  nombre: string
  identificacion: string | null
}

export interface ParticipanteRow {
  id: number
  fk_tmatricula: number
  estudiante_nombre: string
  estudiante_documento: string
  grado_grupo: string
  fecha_inscripcion: string
  fecha_retiro: string | null
  estado_valor: string
  estado_nombre: string
  total_count: number
}

export interface CandidatoRow {
  id: number
  estudiante_nombre: string
  estudiante_documento: string
  grado_grupo: string
}

export interface SesionRow {
  id: number
  fecha: string
  duracion_horas: number
  asistentes: number
  inscritos: number
  fk_tarchivo_soporte: number | null
  soporte_nombre: string | null
  observacion: string | null
  total_count: number
}

export interface SesionAsistente {
  participante: number
  horas?: number | null
}

export type SesionDetalle = SesionVista

export interface ServicioSocialRow {
  id: number
  fk_testudiante: number
  estudiante_nombre: string
  estudiante_documento: string
  grado_grupo: string
  fk_tgrado: number
  horas: number
  horas_requeridas: number
  estado: EstadoServicioSocial
  total_count: number
}

export interface ServicioSocialSesion {
  fecha: string
  actividad: string
  entidad_externa: string | null
  horas: number
  responsable: string
  anio: number
}

export interface ServicioSocialDetalle {
  id: number
  estudiante: string
  estudiante_documento: string
  grado_grupo: string
  horas: number
  horas_requeridas: number
  faltan: number
  estado: EstadoServicioSocial
  sesiones: ServicioSocialSesion[]
}

export interface CertificadoServicioSocial {
  estudiante: string
  estudiante_documento: string
  estudiante_tipo_documento_nombre: string | null
  horas_cumplidas: number
  horas_requeridas: number
  fecha_expedicion: string
  actividades: { actividad: string; entidad_externa: string | null; anio: number; horas: number }[]
  [clave: string]: unknown
}

export interface ParametrosServicioSocial {
  grados: { pk: number; valor: string; nombre: string }[]
}

export interface ActividadInput {
  NOMBRE: string
  FK_TIPO: number
  DESCRIPCION?: string | null
  FK_RESPONSABLE: number
  FK_SEDE: number
  FK_JORNADA: number
  FK_PERIODO: number
  FECHA_INICIO: string
  FECHA_FIN: string
  HORARIO?: string | null
  GRADOS: number[]
  CUPO?: number | null
  ENTIDAD_EXTERNA?: string | null
  SUPERVISOR_EXTERNO?: string | null
  REGISTRA_ASISTENCIA: boolean
  ESTA_ACTIVA: boolean
}

/** El PUT no lleva sede, jornada, período ni estado. */
export type ModificarActividadInput = { id: number } & Omit<
  ActividadInput,
  "FK_SEDE" | "FK_JORNADA" | "FK_PERIODO" | "ESTA_ACTIVA"
>

export interface CambiarEstadoActividadInput {
  id: number
  ESTADO: EstadoActividad
}

export interface InscribirInput {
  id: number
  FK_MATRICULA: number
  FECHA_INSCRIPCION: string
}

export interface NuevaSesionInput {
  id: number
  FECHA: string
  DURACION_HORAS: number
  OBSERVACION?: string | null
  FK_ARCHIVO_SOPORTE?: number | null
  ASISTENTES: SesionAsistente[]
}

export interface NuevaSesionResultado {
  id: number
  asistentes: number
  servicio_social: boolean
}

export interface SesionAsistenteVista {
  participante: number
  fk_tmatricula: number
  estudiante: string
  estudiante_documento: string | null
  horas: number
}

/** `GET /actividades/sesiones/:ID`: la sesión con sus asistentes. */
export interface SesionVista {
  id: number
  fk_tactividad: number
  actividad: string
  fecha: string
  duracion_horas: number
  observacion: string | null
  fk_tarchivo_soporte: number | null
  servicio_social: boolean
  inscritos: number
  asistentes: SesionAsistenteVista[]
}

/** Lo mínimo de una actividad que piden los diálogos de Inactivar/Activar (una fila del listado o el detalle). */
export interface ActividadResumen {
  id: number
  nombre: string
  tipo_nombre: string
  grados_texto: string | null
  responsable_nombre: string
  esta_activa: boolean
  inscritos: number
}

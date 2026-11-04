/** Fila de `GET /comite/periodos`. */
export interface PeriodoComite {
  fk_periodo: number
  nombre: string
  etiqueta: string
  fk_establecimiento: number
  establecimiento: string
  sede: string | null
  jornada: string | null
  fecha_inicio: string
  fecha_fin: string
  abierto: boolean
  fk_comite: number | null
}

export type DatoCargo = "FUNCIONARIO" | "ESTUDIANTE" | "NOMBRE"

export interface IntegranteComite {
  id: number
  fk_tlv_cargo: number
  cargo_codigo: string
  cargo_nombre: string
  fk_funcionario: number | null
  fk_matricula: number | null
  nombre: string
  desde: string
  hasta: string | null
  vigente: boolean
}

export interface CargoVacio {
  fk_tlv_cargo: number
  cargo_codigo: string
  cargo_nombre: string
  dato: DatoCargo
}

/** `comite` de `GET /comite/periodo/:PERIODO`. */
export interface ComiteDetalle {
  fk_periodo: number
  periodo_nombre: string
  fk_establecimiento: number
  fk_comite: number | null
  rector_previsto: { fk_funcionario: number; nombre: string } | null
  integrantes: IntegranteComite[]
  cargos_vacios: CargoVacio[]
  sin_ordinaria_dos_meses: boolean
}

/** Fila de `POST /comite/:ID/sesiones/query`. */
export interface SesionFila {
  id: number
  numero: number | string
  fecha: string
  fk_tlv_tipo: number
  tipo_nombre: string
  asistentes: number
  integrantes_vigentes: number
  con_quorum: boolean
  casos_tratados: number
  total_count?: number
}

export interface AsistenteSesion {
  fk_integrante: number
  cargo_nombre: string
  nombre: string
  asistio: boolean
}

export interface InvitadoSesion {
  nombre: string
  calidad: string
}

export interface CasoSesion {
  fk_caso: number
  numero: number | string
  decision: string
  tipo_codigo: string
  tipo_nombre: string
  manifestacion_nombre: string | null
  estado_codigo: string
  estado_nombre: string
  fk_funcionario_responsable: number | null
  responsable_nombre: string | null
  fecha_seguimiento: string | null
}

/** `sesion` de `GET /comite/sesiones/:ID`. */
export interface SesionDetalle {
  id: number
  fk_comite: number
  numero: number | string
  periodo_nombre: string
  fk_tlv_tipo: number
  tipo_nombre: string
  fecha: string
  otros_temas: string | null
  asistentes_total: number
  integrantes_vigentes: number
  con_quorum: boolean
  asistentes: AsistenteSesion[]
  invitados: InvitadoSesion[]
  casos: CasoSesion[]
}

/** Fila de `GET /comite/:ID/casos`. */
export interface CasoSeleccionable {
  fk_caso: number
  numero: number | string
  tipo_codigo: string
  tipo_nombre: string
  estado_codigo: string
  estado_nombre: string
  estudiantes: string | null
  tratado: boolean
}

/** Fila de `GET /comite/:ID/funcionarios`. */
export interface FuncionarioComite {
  fk_tfuncionario: number
  nombre: string
  rol_nombre: string | null
}

/** Fila de `GET /comite/:ID/estudiantes`. */
export interface EstudianteComite {
  fk_matricula: number
  nombre: string
  grado_grupo: string | null
}

/** Fila de `GET /acciones/:ID/soportes`. */
export interface SoporteAccion {
  id: number
  fk_archivo: number
  nombre: string
  tipo: string | null
  peso: number | null
  vinculado: boolean
  autor: string | null
  fecha: string
  vigente: boolean
  fk_soporte_sustituido: number | null
  retirado_en: string | null
  retirado_por: string | null
  motivo_retiro: string | null
}

export type BaseFechaSiuce = "HECHOS" | "CONOCIMIENTO"

export interface SiuceFiltros {
  BASE_FECHA: BaseFechaSiuce
  DESDE: string
  HASTA: string
  SOLO_PENDIENTES: boolean
}

/** `vista_previa` de `POST /siuce/vista-previa`. */
export interface SiuceVistaPrevia {
  filas: number
  casos: number
  pendientes: number
  excluidos_fecha_desconocida: number
  hojas: number
}

/** Un integrante al crear el Comité o sustituir a otro (claves en minúscula, como el endpoint). */
export interface IntegranteInput {
  fk_tlv_cargo: number
  fk_funcionario?: number | null
  fk_matricula?: number | null
  nombre?: string | null
  desde?: string | null
  hasta?: string | null
}

export interface CasoSesionInput {
  fk_caso: number
  decision: string
  fk_funcionario_responsable?: number | null
  fecha_seguimiento?: string | null
}

/** Cuerpo de `POST /comite/:ID/sesiones` y `PUT /comite/sesiones/:ID`. */
export interface SesionInput {
  FK_TLV_TIPO: number
  FECHA: string
  OTROS_TEMAS?: string | null
  ASISTENTES: number[]
  INVITADOS: InvitadoSesion[]
  CASOS: CasoSesionInput[]
}

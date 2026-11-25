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
  /** Estamento del cargo (solo lectura): lo da el cargo, no se elige. */
  estamento?: string | null
  estamento_codigo?: string | null
  desde: string
  hasta: string | null
  vigente: boolean
}

export interface CargoVacio {
  fk_tlv_cargo: number
  cargo_codigo: string
  cargo_nombre: string
  estamento?: string | null
  estamento_codigo?: string | null
  dato: DatoCargo
}

/** `comite` de `GET /comite/periodo/:PERIODO`. */
export interface ComiteDetalle {
  fk_periodo: number
  periodo_nombre: string
  fk_establecimiento: number
  fk_comite: number | null
  /** Criterio de quórum del Comité (lista CRITERIO_QUORUM_COMITE); por defecto Mitad más uno. */
  fk_tlv_criterio_quorum?: number | null
  criterio_codigo?: string | null
  criterio_nombre?: string | null
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
  /** Por qué no hay quórum (`MotivoQuorum`); nulo con quórum. */
  motivo_quorum?: MotivoQuorum | null
  casos_tratados: number
  /** El backend decide si el usuario puede modificar la sesión. */
  puede_modificar_sesion?: boolean
  total_count?: number
}

export type MotivoQuorum = "SIN_PRESIDENTE" | "INSUFICIENTE" | "ESTAMENTO_FALTANTE"

/** `POST /comite/:ID/quorum`: vista previa del quórum con los asistentes marcados. */
export interface QuorumVistaPrevia {
  asistentes: number
  vigentes: number
  con_quorum: boolean
  criterio_codigo: string | null
  criterio_nombre: string | null
  motivo: MotivoQuorum | null
}

export interface AsistenteSesion {
  fk_integrante: number
  cargo_nombre: string
  estamento?: string | null
  nombre: string
  asistio: boolean
}

export interface EleccionSesion {
  fk_integrante: number
  cargo_nombre: string
  nombre: string
  forma_eleccion: string
}

export interface AdjuntoSesion {
  id: number
  fk_archivo: number
  nombre: string
  tipo: string | null
  peso: number | null
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
  tipo_codigo?: string
  fecha: string
  hora?: string | null
  lugar?: string | null
  objetivo?: string | null
  orden_dia?: string | null
  otros_temas: string | null
  asistentes_total: number
  integrantes_vigentes: number
  con_quorum: boolean
  criterio_quorum?: string | null
  motivo_quorum?: MotivoQuorum | null
  /** Quien elabora el acta (uno de los asistentes). */
  elabora?: { fk_integrante: number; cargo_nombre: string; nombre: string } | null
  /** Nombre del PDF del acta (`acta-comite-aaaa-mm-dd.pdf`). */
  acta_nombre?: string | null
  eleccion?: EleccionSesion[]
  adjuntos?: AdjuntoSesion[]
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

export interface EleccionInput {
  fk_integrante: number
  forma_eleccion: string
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
  HORA?: string | null
  LUGAR?: string | null
  OBJETIVO?: string | null
  ORDEN_DIA?: string | null
  FK_ASISTENTE_ELABORA?: number | null
  ELECCION?: EleccionInput[]
  /** pk de archivo de cada adjunto, ya subido (máximo 5). */
  ADJUNTOS?: number[]
  ASISTENTES: number[]
  INVITADOS: InvitadoSesion[]
  CASOS: CasoSesionInput[]
}

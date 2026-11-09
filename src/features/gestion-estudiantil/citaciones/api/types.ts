// Contrato de V609-V615 (SSO): las filas llegan en snake_case tal como las devuelve `fn_citacion_listar`
// y `fn_compromiso_listar`; los cuerpos de escritura van en MAYÚSCULAS (`:BODY.X`).

export type EstadoCitacionCodigo =
  | "POR_PROGRAMAR"
  | "PROGRAMADA"
  | "CONFIRMADA"
  | "REALIZADA"
  | "ASISTIO"
  | "NO_ASISTIO"
  | "CANCELADA"

export type EstadoCompromisoCodigo = "PENDIENTE_ACEPTACION" | "VIGENTE" | "CUMPLIDO" | "INCUMPLIDO"

export type OrigenCitacionTipo =
  | "ANOTACION"
  | "CASO_CONVIVENCIA"
  | "PROCESO_DISCIPLINARIO"
  | "SENAL_SALUD_MENTAL"
  | "PLAN_ACOMPANAMIENTO"

export type OrigenCompromisoTipo = "CITACION" | "ANOTACION" | "CASO_CONVIVENCIA"

/** Fila de `POST /citaciones/query` (31 columnas; `total_count` se repite en cada fila). */
export interface CitacionRow {
  id: number
  fecha_programada: string | null
  fk_tmatricula: number
  estudiante_nombre: string
  estudiante_documento: string
  fk_tgrupo: number
  grado_grupo: string
  fk_tsede: number
  sede_nombre: string
  fk_tlv_jornada: number
  jornada_nombre: string
  acudiente_nombre: string | null
  fk_tlv_motivo: number
  motivo_valor: string
  motivo_nombre: string
  estado_valor: EstadoCitacionCodigo
  estado_nombre: string
  fk_tfuncionario_atiende: number
  atiende_nombre: string
  fk_tfuncionario_cita: number
  cita_nombre: string
  lugar: string | null
  texto_acudiente: string
  texto_fijo: boolean
  es_automatica: boolean
  origen_tipo: OrigenCitacionTipo | null
  origen_id: number | null
  resumen: string | null
  motivo_cancelacion: string | null
  /** La citación es de quien atiende el usuario actual. */
  es_propia: boolean
  total_count: number
}

export interface HistorialCitacion {
  evento: "REPROGRAMADA" | "INASISTENCIA"
  fecha_programada: string
  lugar: string | null
  resumen: string | null
  registrado_en: string
}

/** `GET /citaciones/:ID` → columna `datos`: la fila más el historial. */
export interface CitacionDetalle extends CitacionRow {
  historial: HistorialCitacion[]
}

/** `GET /citaciones/:ID/documento` → columna `datos`. */
export interface CitacionDocumento {
  establecimiento: string
  estudiante: string
  estudiante_documento: string
  grado_grupo: string
  acudiente: string | null
  texto_acudiente: string
  fecha_programada: string
  lugar: string
  atiende: string
  cita: string
}

/** Fila de `POST /compromisos/query` (25 columnas). */
export interface CompromisoRow {
  id: number
  fecha: string
  fecha_revision: string
  fk_tmatricula: number
  estudiante_nombre: string
  estudiante_documento: string
  fk_tgrupo: number
  grado_grupo: string
  fk_tsede: number
  sede_nombre: string
  fk_tlv_jornada: number
  jornada_nombre: string
  fk_tlv_tipo: number
  tipo_valor: string
  tipo_nombre: string
  estado_valor: EstadoCompromisoCodigo
  estado_nombre: string
  origen_tipo: OrigenCompromisoTipo | null
  origen_id: number | null
  aceptado_presencialmente: boolean
  fk_tarchivo_soporte: number | null
  observacion_resultado: string | null
  fk_tfuncionario_crea: number
  crea_nombre: string
  /** Lo creó el usuario actual (en citaciones la columna es `es_propia`). */
  es_propio: boolean
  total_count: number
}

export interface ItemCompromiso {
  id: number
  descripcion: string
  fk_tlv_responsable: number
  /** NOMBRE de la lista: «Estudiante», «Acudiente», «Institución». */
  responsable: string
  plazo: string
}

/** `GET /compromisos/:ID` → columna `datos`: la fila más los ítems. */
export interface CompromisoDetalle extends CompromisoRow {
  items: ItemCompromiso[]
}

/** `GET /compromisos/:ID/documento` → columna `datos`. */
export interface CompromisoDocumento {
  establecimiento: string
  estudiante: string
  estudiante_documento: string
  acudiente: string | null
  tipo: string
  fecha: string
  fecha_revision: string
  items: ItemCompromiso[]
  crea: string
}

// Filtros de la UI (valores de combo como texto; "" = sin filtro).

export interface CitacionesFiltros {
  sede: string
  jornada: string
  estado: string
  motivo: string
  atiende: string
  desde: string
  hasta: string
}

export const CITACIONES_FILTROS_VACIOS: CitacionesFiltros = {
  sede: "",
  jornada: "",
  estado: "",
  motivo: "",
  atiende: "",
  desde: "",
  hasta: "",
}

export interface CompromisosFiltros {
  sede: string
  jornada: string
  tipo: string
  estado: string
}

export const COMPROMISOS_FILTROS_VACIOS: CompromisosFiltros = { sede: "", jornada: "", tipo: "", estado: "" }

// Cuerpos de `POST .../query` (`BODY.FILTERS.*`).

export interface CitacionesQueryFilters {
  SEARCH: string | null
  ESTADO: string | null
  FK_TLV_MOTIVO: number | null
  FK_TFUNCIONARIO_ATIENDE: number | null
  DESDE: string | null
  HASTA: string | null
  FK_TSEDE: number | null
  FK_TLV_JORNADA: number | null
}

export interface CompromisosQueryFilters {
  SEARCH: string | null
  FK_TLV_TIPO: number | null
  ESTADO: string | null
  FK_TSEDE: number | null
  FK_TLV_JORNADA: number | null
}

// Cuerpos de escritura.

export interface CrearCitacionInput {
  FK_MATRICULA: number
  FK_MOTIVO: number
  TEXTO: string
  /** `yyyy-MM-ddTHH:mm`, posterior a ahora. */
  FECHA: string
  LUGAR: string
  FK_ATIENDE?: number | null
  ORIGEN_TIPO?: "ANOTACION" | "CASO_CONVIVENCIA" | null
  ORIGEN_ID?: number | null
}

export interface ProgramarCitacionInput {
  id: number
  FECHA: string
  LUGAR: string
  /** Solo en automáticas sin texto fijo. */
  TEXTO?: string | null
}

export interface ReprogramarCitacionInput {
  id: number
  FECHA: string
  /** Vacío conserva el lugar actual. */
  LUGAR?: string | null
}

export interface CancelarCitacionInput {
  id: number
  MOTIVO: string
}

export interface RegistrarAsistenciaInput {
  id: number
  ASISTENCIA: "ASISTIO" | "NO_ASISTIO"
  RESUMEN: string
}

export interface ItemCompromisoInput {
  descripcion: string
  /** pk de TLISTA_VALOR como texto (`^[0-9]{1,18}$`). */
  fk_tlv_responsable: string
  /** `yyyy-MM-dd`, entre FECHA y FECHA_REVISION. */
  plazo: string
}

export interface CrearCompromisoInput {
  FK_MATRICULA: number
  FK_TIPO: number
  FECHA: string
  FECHA_REVISION: string
  ITEMS: ItemCompromisoInput[]
  ACEPTADO?: boolean
  FK_ARCHIVO?: number | null
  ORIGEN_TIPO?: OrigenCompromisoTipo | null
  ORIGEN_ID?: number | null
}

export interface AceptacionPresencialInput {
  id: number
  FK_ARCHIVO: number
}

export interface ResultadoCompromisoInput {
  id: number
  RESULTADO: "CUMPLIDO" | "INCUMPLIDO"
  OBSERVACION?: string | null
}

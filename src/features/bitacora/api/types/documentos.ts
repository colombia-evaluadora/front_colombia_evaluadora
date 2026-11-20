/** Estados de un documento emitido (B.8.LIS.1). */
export const ESTADOS_DOCUMENTO = {
  VIGENTE: "Vigente",
  REEMPLAZADO: "Reemplazado",
  ANULADO: "Anulado",
} as const

export type EstadoDocumento = keyof typeof ESTADOS_DOCUMENTO

export const TIPOS_DOCUMENTO = [
  "Informe de período",
  "Constancia de reserva de cupo",
  "Certificado de estudios",
  "Mención de honor",
  "Certificado de servicio social",
] as const

/** Un cambio de estado del documento: «15/04/2027 10:42 · Emitido · Vigente». */
export interface HistorialDocumento {
  fecha: string
  texto: string
}

/** Consultas de la página de verificación en un día (B.8.LIS.1). */
export interface ConsultaVerificacion {
  fecha: string
  consultas: number
  /** «Ver el contenido (1)» u otro uso además de verificar; `null` si no hubo. */
  otrosUsos: string | null
}

export interface DocumentoEmitido {
  codigo: string
  tipo: string
  estudiante: string
  documentoEstudiante: string
  gradoGrupo: string
  periodo: string
  generadoEn: string
  generadoPor: string
  estado: EstadoDocumento
  consultas: number
  historial: HistorialDocumento[]
  consultasDetalle: ConsultaVerificacion[]
}

export interface DocumentosFiltros {
  /** Código o estudiante. */
  q: string
  tipo: string
  estado: string
  desde: string
  hasta: string
}

export interface DocumentosPagina {
  rows: DocumentoEmitido[]
  totalCount: number
  pageCount: number
}

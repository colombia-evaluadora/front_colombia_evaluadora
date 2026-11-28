import type { EstadoOrientacionRecibida } from "@/features/establishment/institution/api/schema"

/** Fila de la pestaña Orientaciones (informe, 2.3; sso `fn_orientaciones_recibidas_interno`). */
export interface OrientacionRecibida {
  id: number
  establecimientoId: number
  establecimiento: string
  /** `yyyy-MM-dd`. */
  fechaEnvio: string
  /** `pk_lista_valor` de TEMA_ORIENTACION_TERRITORIAL. */
  temaId: number
  /** Nombre vigente del tema en la Lista de Valores. */
  tema: string
  orientacion: string
  /** Rol territorial de quien la envió: «Supervisor territorial» o «Administrador territorial». */
  enviadaPor: string
  estado: EstadoOrientacionRecibida
  /** `yyyy-MM-dd`; null mientras está Enviada. */
  fechaAtencion: string | null
}

export interface OrientacionesRecibidas {
  rows: OrientacionRecibida[]
  totalCount: number
  pageCount: number
  /** Enviadas sin responder, sin filtros: el número del nombre de la pestaña. */
  pendientes: number
}

/** Alerta escalada a la que responde la orientación (Gestión Estudiantil, 9.11). */
export interface AlertaVinculada {
  id: number
  /** «Sara G. · 6°A»: sin apellidos completos ni documento. */
  estudiante: string | null
  umbral: string | null
  escaladaEl: string | null
}

export interface OrientacionRecibidaDetalle extends OrientacionRecibida {
  respuesta: string | null
  respondidaPor: string | null
  alerta: AlertaVinculada | null
}

export interface OrientacionesRecibidasParams {
  /** Solo para el Superadministrador, que elige el establecimiento. */
  establecimientoId?: number
  search?: string
  estado?: EstadoOrientacionRecibida
  /** `pk_lista_valor` del tema. */
  temaId?: number
  sortBy?: string
  sortDesc?: boolean
  pageIndex: number
  pageSize: number
}

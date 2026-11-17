// Autorización de tratamiento de datos (Ley 1581 de 2012). Cobertura Educativa §3.3,
// Regla 81 (inscripciones, por establecimiento) y Establecimiento Regla 116 (funcionario
// agregado a otro establecimiento). sso #1004: V423-V426 y V579.4-V579.6.

/** Un establecimiento y si ya tiene la autorización (`fn_inscripcion_autorizaciones`). */
export interface AutorizacionEstablecimiento {
  establecimientoId: number
  establecimiento: string
  autorizado: boolean
}

export type TipoAutorizacionPendiente = "INSCRIPCION" | "FUNCIONARIO"

/**
 * Fila de `GET /cobertura-academica/inscripciones/autorizaciones-pendientes`. La de
 * FUNCIONARIO (a lo sumo una) trae `inscripcionId`, `numero` y `aspirante` en null.
 */
export interface AutorizacionPendiente {
  tipo: TipoAutorizacionPendiente
  inscripcionId: number | null
  numero: string | null
  aspirante: string | null
  establecimientos: AutorizacionEstablecimiento[]
}

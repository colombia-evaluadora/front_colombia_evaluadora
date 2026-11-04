/**
 * Ícono de la Iconografía: un valor de la lista ICONOGRAFIA de TLISTA_VALOR. Como en
 * GRAFICA_SIMBOLO, `valor` es la clave S3 de su archivo (se sirve por /files/public).
 */
export interface Icono {
  pkIcono: number
  nombre: string
  /** Clave S3 del archivo (`<sitio>/iconografia/<pk>.svg|png`). */
  valor: string
  /** Posición en la Iconografía (TLISTA_VALOR.ORDEN); se cambia arrastrando. */
  orden: number
  habilitado: boolean
  active: boolean
  /** Alguna valoración lo usa: no se elimina, se inactiva (Regla 3). */
  enUso: boolean
}

export const ICONO_NOMBRE_MIN = 2
export const ICONO_NOMBRE_MAX = 50
export const ICONO_MAX_BYTES = 100 * 1024

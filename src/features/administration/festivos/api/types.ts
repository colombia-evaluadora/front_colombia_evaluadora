/** Envoltura de las funciones de festivos: `SELECT fn(...) AS resultado`. */
export interface Resultado<T> {
  resultado: T
}

export type TipoFecha = "FIJA" | "LEY_EMILIANI" | "PASCUA"

/** Forma de `fn_festivo_json_interno` (V337.3). */
export interface Festivo {
  pkFestivo: number
  nombre: string
  tipoFecha: TipoFecha
  /** FIJA y LEY_EMILIANI. */
  mes: number | null
  dia: number | null
  /** PASCUA: días respecto del Domingo de Pascua (−10 a 100). */
  diasPascua: number | null
  /** PASCUA: si cae fuera de lunes, pasa al lunes siguiente. */
  trasladoLunes: boolean
  /** Activo. Inactivo deja de copiarse a los períodos por comenzar. */
  habilitado: boolean
  /** yyyy-MM-dd, calculada por el back. */
  fechaAnioEnCurso: string
  /** Lo usa un período que ya comenzó: no se puede eliminar, solo inactivar. */
  enUso: boolean
}

export const TIPO_FECHA_LABELS: Record<TipoFecha, string> = {
  FIJA: "Fija",
  LEY_EMILIANI: "Ley Emiliani",
  PASCUA: "Relativa a la Pascua",
}

/** Qué hace cada tipo, para la ayuda del formulario. */
export const TIPO_FECHA_AYUDA: Record<TipoFecha, string> = {
  FIJA: "Cae siempre el mismo día.",
  LEY_EMILIANI: "Si no cae en lunes, pasa al lunes siguiente (Ley 51 de 1983).",
  PASCUA: "Se cuenta desde el Domingo de Pascua de cada año.",
}

export const FESTIVO_EN_USO_MENSAJE =
  "Lo usa el Calendario Académico de un período que ya comenzó: no se puede eliminar. Puede inactivarlo."

/** Largo máximo de una observación de estudiante. Aplica a las tres
 *  superficies que la escriben (panel lateral, popover de la Planilla y
 *  observación grupal) para que el tope no dependa de por dónde se entre. */
export const OBSERVACION_MAX_CARACTERES = 500

/** Máximo de evidencias adjuntas por observación — el backend no impone un
 *  límite (`TACTIVIDAD_SOPORTE` es una relación libre), así que lo pone el
 *  front para no dejar crecer sin control la galería de un estudiante. */
export const OBSERVACION_EVIDENCIAS_MAX = 5

/** Peso máximo de UNA evidencia, en bytes. */
export const OBSERVACION_EVIDENCIA_MAX_MB = 5
export const OBSERVACION_EVIDENCIA_MAX_BYTES = OBSERVACION_EVIDENCIA_MAX_MB * 1024 * 1024

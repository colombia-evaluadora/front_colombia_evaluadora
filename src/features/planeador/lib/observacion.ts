/** Largo máximo de una observación de estudiante. Aplica a las superficies
 *  que la escriben (panel lateral, registro narrativo en bloque) para que el
 *  tope no dependa de por dónde se entre. */
export const OBSERVACION_MAX_CARACTERES = 1000

/** Máximo de evidencias adjuntas por observación — el backend no impone un
 *  límite (`TACTIVIDAD_SOPORTE` es una relación libre), así que lo pone el
 *  front para no dejar crecer sin control la galería de un estudiante. */
export const OBSERVACION_EVIDENCIAS_MAX = 3

/** Peso máximo de UNA evidencia, en bytes. */
export const OBSERVACION_EVIDENCIA_MAX_MB = 10
export const OBSERVACION_EVIDENCIA_MAX_BYTES = OBSERVACION_EVIDENCIA_MAX_MB * 1024 * 1024

/** Tipos de evidencia permitidos (criterio de aceptación: PDF, DOC, DOCX, JPG, PNG). */
export const OBSERVACION_EVIDENCIA_EXTENSIONES = ["pdf", "doc", "docx", "jpg", "jpeg", "png"] as const
export const OBSERVACION_EVIDENCIA_ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png"
export const OBSERVACION_EVIDENCIA_TIPOS_LABEL = "PDF, DOC, DOCX, JPG o PNG"

function extension(nombre: string | null | undefined): string {
  const match = /\.([^.]+)$/.exec(nombre ?? "")
  return match ? match[1].toLowerCase() : ""
}

/** Mensaje de por qué el archivo no se puede adjuntar; `null` = válido. */
export function validarEvidencia(archivo: File, cantidadActual: number): string | null {
  if (cantidadActual >= OBSERVACION_EVIDENCIAS_MAX) {
    return `Máximo ${OBSERVACION_EVIDENCIAS_MAX} evidencias por estudiante.`
  }
  if (!(OBSERVACION_EVIDENCIA_EXTENSIONES as readonly string[]).includes(extension(archivo.name))) {
    return `Formato no permitido. Solo se aceptan archivos ${OBSERVACION_EVIDENCIA_TIPOS_LABEL}.`
  }
  if (archivo.size > OBSERVACION_EVIDENCIA_MAX_BYTES) {
    return `El archivo supera el máximo de ${OBSERVACION_EVIDENCIA_MAX_MB} MB.`
  }
  return null
}

/** Imagen (se muestra miniatura) vs. documento (se muestra ícono). */
export function esEvidenciaImagen(nombre: string | null | undefined): boolean {
  const ext = extension(nombre)
  // Sin extensión: evidencias viejas, que solo podían ser imágenes.
  return ext === "" || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)
}

/** Extensión en mayúsculas para la tarjeta de un documento ("PDF", "DOCX"). */
export function extensionEvidencia(nombre: string | null | undefined): string {
  return extension(nombre).toUpperCase() || "ARCHIVO"
}

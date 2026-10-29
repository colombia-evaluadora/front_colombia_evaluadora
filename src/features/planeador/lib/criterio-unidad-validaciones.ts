import { plainTextInvalidChars } from "@/lib/text-input"

/**
 * Largo máximo del texto de un criterio de la unidad ("Agregar criterio").
 * La columna `TCRITERIO_UNIDAD.DESCRIPCION` es VARCHAR(4000) y el back no
 * limita más (`fn_unidad_validar_criterio_texto`, V492.1, solo exige que no
 * esté vacío); 500 = mismo tope que la descripción de la unidad.
 */
export const CRITERIO_UNIDAD_MAX = 500

/**
 * Error del texto del criterio, o `undefined` si es válido. Misma regla de
 * caracteres que los textos de la unidad (`PLAIN_TEXT_PATTERN`). Ojo: el back
 * NO valida caracteres del criterio, así que este es el único filtro.
 */
export function validarCriterioUnidad(nombre: string): string | undefined {
  const texto = (nombre ?? "").trim()
  if (!texto) return "El criterio es obligatorio"
  if (texto.length > CRITERIO_UNIDAD_MAX) {
    return `El criterio admite máximo ${CRITERIO_UNIDAD_MAX} caracteres (tiene ${texto.length})`
  }
  const invalidos = plainTextInvalidChars(texto)
  if (invalidos.length > 0) {
    const lista = invalidos.map((c) => (c.trim() ? `"${c}"` : "salto o tabulación")).join(" ")
    return `El criterio solo admite letras (con tilde, diéresis o ñ), números, espacios, guiones y apóstrofos. Quita: ${lista}`
  }
  return undefined
}

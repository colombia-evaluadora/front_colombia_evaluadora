/**
 * Mensajes de validación compartidos por los schemas zod de los formularios.
 *
 * La redacción se copió de los mensajes que ya existían sueltos en el repo
 * (y que QA ya vio): "El nombre es obligatorio", "La abreviación no puede
 * superar los 30 caracteres", "Este campo es obligatorio.", etc. Antes de
 * cambiar un texto acá, tené en cuenta que se repite en todas las pantallas
 * que lo usen.
 *
 * Convención: los helpers que reciben `subject` lo esperan CON artículo
 * ("El nombre", "La abreviación") porque el español no deja derivar el
 * género del sustantivo; la concordancia del adjetivo se pide con
 * `{ femenino: true }`. Sin `subject` caen al mensaje genérico.
 */

/** Mensaje genérico de campo vacío (el `ERROR_OBLIGATORIO` del planeador). */
export const REQUIRED = "Este campo es obligatorio."

/** Aviso de formulario incompleto al intentar guardar. */
export const INCOMPLETE_FORM = "Completa los campos obligatorios antes de guardar."

interface GenderOptions {
  /** `true` → "obligatoria" en vez de "obligatorio". */
  femenino?: boolean
}

/**
 * `required("El código")` → "El código es obligatorio".
 * `required("La abreviación", { femenino: true })` → "La abreviación es obligatoria".
 * `required()` → `REQUIRED`.
 */
export function required(subject?: string, { femenino = false }: GenderOptions = {}): string {
  if (!subject) return REQUIRED
  return `${subject} es ${femenino ? "obligatoria" : "obligatorio"}`
}

/**
 * `maxLength(130, "El nombre")` → "El nombre no puede superar los 130 caracteres".
 * `maxLength(50)` → "Máximo 50 caracteres."
 */
export function maxLength(max: number, subject?: string): string {
  if (!subject) return `Máximo ${max} caracteres.`
  return `${subject} no puede superar los ${max} caracteres`
}

/** `minLength(8)` → "Debe tener al menos 8 caracteres." */
export function minLength(min: number, subject?: string): string {
  if (!subject) return `Debe tener al menos ${min} caracteres.`
  return `${subject} debe tener al menos ${min} caracteres.`
}

/**
 * `range(0, 100, "El puntaje")` → "El puntaje debe estar entre 0 y 100."
 * `range(1, 99)` → "Debe estar entre 1 y 99."
 */
export function range(min: number, max: number, subject?: string): string {
  return `${subject ? `${subject} debe` : "Debe"} estar entre ${min} y ${max}.`
}

/** Mismo texto que el campo URL de los referentes/recursos. */
export function invalidUrl(): string {
  return "Ingresá una URL válida (debe empezar con http:// o https://)."
}

/** El texto más repetido del repo para correos (establecimiento, funcionarios). */
export function invalidEmail(): string {
  return "Formato de correo electrónico inválido."
}

export function invalidDate(): string {
  return "Ingresa una fecha válida."
}

/** `fileTooLarge(25)` → "El archivo supera el máximo de 25 MB." */
export function fileTooLarge(mb: number): string {
  return `El archivo supera el máximo de ${mb} MB.`
}

/**
 * `invalidFileType(["PDF", "JPG", "PNG"])` → "Formato no permitido. Usa PDF, JPG, PNG."
 * Acepta también el texto ya armado ("PDF, JPG o PNG").
 */
export function invalidFileType(exts: string | readonly string[]): string {
  const allowed = typeof exts === "string" ? exts : exts.join(", ")
  return `Formato no permitido. Usa ${allowed}.`
}

/** El backend responde 22023 con este texto cuando la actividad no tiene cupo (Regla 31). */
const CUPO_COMPLETO = /cupo completo/i
/** El backend responde 23505 con este texto cuando el nombre ya existe en el Período Académico. */
const NOMBRE_REPETIDO = /ya existe la actividad/i

/** Mensaje de cupo lleno para mostrarlo en el campo Estudiante, o `null` si el error es otro. */
export const mensajeCupoCompleto = (mensaje: string): string | null => (CUPO_COMPLETO.test(mensaje) ? mensaje : null)

/** Mensaje de nombre repetido para mostrarlo en el campo Nombre, o `null` si el error es otro. */
export const mensajeNombreRepetido = (mensaje: string): string | null =>
  NOMBRE_REPETIDO.test(mensaje) ? mensaje : null

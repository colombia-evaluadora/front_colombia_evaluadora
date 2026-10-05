import type { AnyFieldApi } from "@tanstack/react-form"

/**
 * Regla única de "mostrar el error de este campo": se marca inválido recién
 * cuando el usuario lo tocó o intentó enviar el form, y hay errores. Antes
 * cada form la reescribía (algunos sin `submissionAttempts`, así que un
 * submit con campos sin tocar no pintaba nada).
 */
export function isFieldInvalid(
  field: Pick<AnyFieldApi, "state">,
  submissionAttempts: number,
): boolean {
  return (field.state.meta.isTouched || submissionAttempts > 0) && !field.state.meta.isValid
}

/**
 * Los errores de TanStack Form llegan como objetos `{ message }` (schemas
 * zod / Standard Schema) o como string (validadores que devuelven texto).
 * `FieldError` solo entiende la primera forma.
 */
export function toFieldErrors(errors: unknown[]): Array<{ message?: string }> {
  return errors
    .filter((error) => error != null && error !== "")
    .map((error) =>
      typeof error === "string" ? { message: error } : (error as { message?: string }),
    )
}

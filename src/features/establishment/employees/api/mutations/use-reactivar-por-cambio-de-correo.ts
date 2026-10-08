import { useMutation } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { toEmailInput } from "@/lib/text-input"
import type { MutationConfig } from "@/lib/react-query"

export interface CambioCorreoInput {
  correoAnterior: string
  correoNuevo: string
}

/**
 * Cambio de correo de un funcionario: la edición (PATCH por query-service)
 * sincroniza el correo a `public.users` en SQL, que no puede mandar correos.
 * Después de guardar, este POST a auth-center deja la cuenta pendiente de
 * activación y envía el correo de activación al correo NUEVO (enlace de
 * Colombia Evaluadora; la app sale de la ruta `cval`). Mismo gate de permisos
 * que `POST /register/cval/funcionario`.
 *
 * El backend exige que el cambio ya esté guardado (rechaza con 400 si la
 * cuenta todavía tiene el correo anterior), así que solo se llama tras un
 * guardado exitoso. Sin handler MSW: con mocks activos es un no-op.
 */
export async function reactivarPorCambioDeCorreo(input: CambioCorreoInput): Promise<void> {
  if (env.ENABLE_API_MOCKING) return
  await api.post("/auth/register/cval/funcionario/reactivar-por-cambio-de-correo", input)
}

export function useReactivarPorCambioDeCorreo({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof reactivarPorCambioDeCorreo> } = {}) {
  return useMutation({ mutationFn: reactivarPorCambioDeCorreo, ...mutationConfig })
}

/** true si el correo cambió de verdad (sin distinguir mayúsculas, espacios ni caracteres invisibles). */
export function correoCambio(anterior: string | null | undefined, nuevo: string | null | undefined) {
  const a = toEmailInput(anterior ?? "").toLowerCase()
  const n = toEmailInput(nuevo ?? "").toLowerCase()
  return a !== "" && n !== "" && a !== n
}

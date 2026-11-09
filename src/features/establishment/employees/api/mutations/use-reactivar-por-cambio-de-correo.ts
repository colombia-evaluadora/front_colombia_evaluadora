import { useMutation } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { toEmailInput } from "@/lib/text-input"
import type { MutationConfig } from "@/lib/react-query"

export interface CambioCorreoInput {
  correoAnterior: string
  correoNuevo: string
}

/** Tras guardar un cambio de correo, deja la cuenta pendiente y envía la activación al nuevo. */
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

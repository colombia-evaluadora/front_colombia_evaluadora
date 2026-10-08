import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

/**
 * Reenvía el correo de activación de una cuenta pendiente. 204 si salió; 409
 * si la cuenta ya no está pendiente (el mensaje del backend se muestra tal
 * cual vía `getErrorMessage`).
 */
async function resendActivation(correo: string): Promise<void> {
  await api.post("/auth/register/cval/funcionario/reenviar-activacion", { correo })
}

interface UseResendActivationOptions {
  mutationConfig?: MutationConfig<typeof resendActivation>
}

export function useResendActivation({ mutationConfig }: UseResendActivationOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}

  return useMutation({
    mutationFn: resendActivation,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["funcionarios-estado-cuenta"] })
      onSuccess?.(...args)
    },
  })
}

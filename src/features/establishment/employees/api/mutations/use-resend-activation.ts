import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { employeeKeys } from "@/features/establishment/employees/api/query-keys"

/** 204 si se envió; 409 si la cuenta ya no está pendiente. */
export async function resendActivation(correo: string): Promise<void> {
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
      queryClient.invalidateQueries({ queryKey: employeeKeys.estadoCuentaAll })
      onSuccess?.(...args)
    },
  })
}

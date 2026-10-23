import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { activationTokenStatusQueryKey } from "@/features/auth/api/query/use-activation-token-status-query"

interface ActivateAccountInput {
  token: string
  password: string
}

function activateAccount(data: ActivateAccountInput): Promise<void> {
  // `app`: el SSO arma el correo de confirmación con la marca, el remitente y
  // la mesa de ayuda de la app desde la que se hizo. Sin ella la deducía de
  // los roles, y a un usuario con roles de CE y de PIGSE le llegaba como PIGSE.
  return api.post("/sso-admin/activateAccount", data, { params: { app: env.NAME } })
}

interface UseActivateAccountOptions {
  mutationConfig?: MutationConfig<typeof activateAccount>
}

export function useActivateAccount({ mutationConfig }: UseActivateAccountOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: activateAccount,
    ...mutationConfig,
    onError: (...args) => {
      const [, variables] = args
      queryClient.invalidateQueries({
        queryKey: activationTokenStatusQueryKey(variables.token),
      })
      mutationConfig?.onError?.(...args)
    },
  })
}

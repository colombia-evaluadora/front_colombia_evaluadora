import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { resetTokenStatusQueryKey } from "@/features/auth/api/query/use-reset-token-status-query"

interface RestorePasswordInput {
  token: string
  password: string
}

function restorePassword(data: RestorePasswordInput): Promise<void> {
  // `app`: el SSO arma el correo de confirmación con la marca, el remitente y
  // la mesa de ayuda de la app desde la que se hizo. Sin ella la deducía de
  // los roles, y a un usuario con roles de CE y de PIGSE le llegaba como PIGSE.
  return api.post("/sso-admin/restorePassword", data, { params: { app: env.NAME } })
}

interface UseRestorePasswordOptions {
  mutationConfig?: MutationConfig<typeof restorePassword>
}

export function useRestorePassword({ mutationConfig }: UseRestorePasswordOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: restorePassword,
    ...mutationConfig,
    onError: (...args) => {
      const [, variables] = args
      queryClient.invalidateQueries({
        queryKey: resetTokenStatusQueryKey(variables.token),
      })
      mutationConfig?.onError?.(...args)
    },
  })
}

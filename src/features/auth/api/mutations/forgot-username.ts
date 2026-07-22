import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ForgotUsernameResponse } from "../types/password-recovery"

function forgotUsername(email: string): Promise<ForgotUsernameResponse> {
  return api.get("/sso-admin/forgotUsername", { params: { email } })
}

interface UseForgotUsernameOptions {
  mutationConfig?: MutationConfig<typeof forgotUsername>
}

export function useForgotUsername({
  mutationConfig,
}: UseForgotUsernameOptions = {}) {
  return useMutation({
    mutationFn: forgotUsername,
    ...mutationConfig,
  })
}

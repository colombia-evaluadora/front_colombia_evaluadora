import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { captchaHeaders } from "@/lib/captcha"
import type { CaptchaState } from "@/hooks/use-captcha"
import type { ResetTokenStatusResponse } from "@/features/auth/api/types/password-recovery"

function fetchActivationTokenStatus(
  token: string,
  captchaToken: string | null,
): Promise<ResetTokenStatusResponse> {
  return api.get("/sso-admin/activationTokenStatus", {
    params: { token, app: env.NAME },
    headers: captchaHeaders(captchaToken),
  })
}

export const activationTokenStatusQueryKey = (token: string | undefined) => [
  "auth",
  "activation-token-status",
  token,
]

/**
 * Estado del enlace de activación — mismo contrato y mismo motivo que
 * `useResetTokenStatusQuery` (captcha incluido), contra
 * `/activationTokenStatus` en vez de `/resetTokenStatus`.
 */
export function useActivationTokenStatusQuery(token: string | undefined, captcha: CaptchaState) {
  return useQuery({
    queryKey: activationTokenStatusQueryKey(token),
    queryFn: () => fetchActivationTokenStatus(token!, captcha.consume()),
    enabled: !!token && captcha.ready,
    staleTime: Infinity,
    retry: false,
  })
}

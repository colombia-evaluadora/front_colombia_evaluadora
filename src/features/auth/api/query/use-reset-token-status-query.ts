import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { captchaHeaders } from "@/lib/captcha"
import type { CaptchaState } from "@/hooks/use-captcha"
import type { ResetTokenStatusResponse } from "@/features/auth/api/types/password-recovery"

function fetchResetTokenStatus(
  token: string,
  captchaToken: string | null,
): Promise<ResetTokenStatusResponse> {
  return api.get("/sso-admin/resetTokenStatus", {
    params: { token, app: env.NAME },
    headers: captchaHeaders(captchaToken),
  })
}

export const resetTokenStatusQueryKey = (token: string | undefined) => [
  "auth",
  "reset-token-status",
  token,
]

/**
 * Estado del enlace de reseteo. Se consulta una sola vez por token: la
 * cuenta regresiva la lleva el cliente a partir del `expiresIn` que devuelve
 * esta respuesta, sin repreguntar cada segundo.
 *
 * Es un endpoint público con captcha (sso-admin, solo para Colombia
 * Evaluadora): espera a que el widget de la pantalla tenga token y lo
 * consume (`captcha.consume()` reinicia el widget para el envío del form).
 * Si se invalida (p. ej. tras un error al restaurar), vuelve a consultar en
 * cuanto haya un token nuevo. El token del captcha no va en la key.
 */
export function useResetTokenStatusQuery(token: string | undefined, captcha: CaptchaState) {
  return useQuery({
    queryKey: resetTokenStatusQueryKey(token),
    queryFn: () => fetchResetTokenStatus(token!, captcha.consume()),
    enabled: !!token && captcha.ready,
    staleTime: Infinity,
    retry: false,
  })
}

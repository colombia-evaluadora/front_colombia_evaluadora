import { useMutation } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api, isNotFoundError } from "@/lib/api-client"
import { loginBody } from "@/lib/auth"
import { captchaHeaders } from "@/lib/captcha"
import type { MutationConfig } from "@/lib/react-query"
import type { ForgotPasswordResponse } from "@/features/auth/api/types/password-recovery"

/**
 * Pide el enlace de recuperación con el correo o el número de documento.
 *
 * El backend de Colombia Evaluadora (sso `UserAdminService#forgotPassword`,
 * "[admin] Acceso y sesiones") responde **siempre igual**, exista o no la
 * cuenta: no se puede saber desde acá si el correo salió, y la pantalla no lo
 * dice. Por eso un 404 (backend anterior) también se toma como envío: la
 * persona ve el mismo mensaje en todos los casos.
 */
async function forgotPassword({
  identificador,
  captchaToken,
}: {
  /** Correo o número de documento, tal como lo escribió. */
  identificador: string
  /** Token de Turnstile (`useCaptcha().consume()`), un solo uso. */
  captchaToken: string | null
}): Promise<ForgotPasswordResponse | null> {
  const { email, documento } = loginBody({ email: identificador }) as { email?: string; documento?: string }
  try {
    return await api.get<ForgotPasswordResponse>("/sso-admin/forgotPassword", {
      params: { email, documento, app: env.NAME },
      headers: captchaHeaders(captchaToken),
    })
  } catch (error) {
    if (isNotFoundError(error)) return null
    throw error
  }
}

interface UseForgotPasswordOptions {
  mutationConfig?: MutationConfig<typeof forgotPassword>
}

export function useForgotPassword({ mutationConfig }: UseForgotPasswordOptions = {}) {
  return useMutation({
    mutationFn: forgotPassword,
    ...mutationConfig,
  })
}

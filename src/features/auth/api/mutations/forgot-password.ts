import { useMutation } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api, isNotFoundError } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ForgotPasswordResponse,
  ResetTokenStatusResponse,
} from "@/features/auth/api/types/password-recovery"

/**
 * El correo que se pidió recuperar no pertenece a ninguna cuenta.
 *
 * Es el único error *esperado* de este flujo, y la pantalla lo muestra en su
 * propio aviso en vez de tratarlo como una falla. Se distingue por tipo y no
 * por el status HTTP porque llega por dos caminos distintos (ver abajo).
 */
export class EmailNotRegisteredError extends Error {
  constructor() {
    super("No encontramos una cuenta con ese correo electrónico.")
    this.name = "EmailNotRegisteredError"
  }
}

/**
 * Pide el enlace de recuperación.
 *
 * Hay dos versiones del backend en circulación y esto tiene que funcionar con
 * las dos:
 *
 * 1. La desplegada hoy responde **200 con un token igual** aunque el correo no
 *    exista — así no delata qué direcciones están registradas. Ese token se
 *    genera al vuelo y NO se persiste, así que preguntarle su estado a
 *    `resetTokenStatus` lo delata: responde `invalid`. Ese es el único modo de
 *    saber desde el front que la dirección no existe sin esperar un despliegue.
 * 2. La nueva (`UserAdminService#forgotPassword` en el repo del SSO) responde
 *    **404** directo. Ahí el segundo viaje ni siquiera ocurre.
 *
 * Ambos caminos terminan en `EmailNotRegisteredError`, así que la pantalla no
 * necesita saber contra cuál de las dos está corriendo. Cuando el servidor ya
 * tenga la versión nueva desplegada en todos lados, el bloque del token sobra
 * y se puede borrar entero.
 */
async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  let response: ForgotPasswordResponse
  try {
    response = await api.get<ForgotPasswordResponse>("/sso-admin/forgotPassword", {
      params: { email, app: env.NAME },
    })
  } catch (error) {
    if (isNotFoundError(error)) throw new EmailNotRegisteredError()
    throw error
  }

  if (response.token) {
    // Falla abierta a propósito: solo un `invalid` explícito bloquea. Si esta
    // segunda consulta no se puede hacer (red caída, 500, el endpoint todavía
    // no desplegado), se sigue de largo — el correo ya salió, y trabar acá a
    // un usuario legítimo por una comprobación auxiliar sería peor que no
    // hacerla.
    let status: ResetTokenStatusResponse | undefined
    try {
      status = await api.get<ResetTokenStatusResponse>("/sso-admin/resetTokenStatus", {
        params: { token: response.token },
      })
    } catch {
      status = undefined
    }
    if (status?.status === "invalid") throw new EmailNotRegisteredError()
  }

  return response
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

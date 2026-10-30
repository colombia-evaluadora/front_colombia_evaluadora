import { HttpResponse } from "msw"

import { CAPTCHA_HEADER } from "@/lib/captcha"

/**
 * Mismo contrato que el `CaptchaVerifier` del SSO: sin `X-Captcha-Token` el
 * endpoint público responde 403 con el mensaje en español. Con mocks el front
 * manda un token fijo (`MOCK_CAPTCHA_TOKEN`), así que esto falla solo si una
 * pantalla se olvida de enviarlo. No valida el valor: no hay Cloudflare.
 *
 * Devuelve la respuesta de rechazo, o `null` si la request puede seguir.
 */
export function rejectWithoutCaptcha(request: Request): Response | null {
  const token = request.headers.get(CAPTCHA_HEADER)
  if (token && token.trim()) return null
  return HttpResponse.json(
    { code: "CAPTCHA", message: "Debe completar la verificación de seguridad (captcha)." },
    { status: 403 },
  )
}

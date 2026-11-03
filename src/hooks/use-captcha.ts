import { useRef, useState } from "react"

import { bypassCaptchaToken, isCaptchaBypassed } from "@/lib/captcha"

export interface CaptchaState {
  /** Token vigente del widget (`null` mientras se resuelve o tras consumirlo). */
  token: string | null
  /** Hay token para mandar (o no hace falta: mocks / sin site key). */
  ready: boolean
  /**
   * Devuelve el token y reinicia el widget en el mismo paso: los tokens de
   * Turnstile son de UN solo uso, así que cada request se lleva el suyo y el
   * siguiente envío (o reintento tras un error) espera a uno nuevo.
   */
  consume: () => string | null
  /** Reinicia el widget sin usar el token (p. ej. tras un error de red). */
  reset: () => void
  /** Props para `<Turnstile {...captcha.widget} />`. */
  widget: { onToken: (token: string | null) => void; resetSignal: number }
}

/**
 * Estado del captcha de un formulario público. Va de la mano con
 * `<Turnstile>` (`components/captcha/turnstile.tsx`), que es quien entrega los
 * tokens. Con mocks (MSW) no hay widget: el token es fijo y siempre está listo.
 */
export function useCaptcha(): CaptchaState {
  const bypass = isCaptchaBypassed()
  const [token, setTokenState] = useState<string | null>(() => (bypass ? bypassCaptchaToken() : null))
  // Espejo síncrono: `consume()` corre en handlers/queryFn y no puede esperar
  // al próximo render para leer el token.
  const tokenRef = useRef<string | null>(token)
  const [resetSignal, setResetSignal] = useState(0)

  const setToken = (next: string | null) => {
    tokenRef.current = next
    setTokenState(next)
  }

  const reset = () => {
    if (bypass) return
    setToken(null)
    setResetSignal((n) => n + 1)
  }

  const consume = () => {
    const current = tokenRef.current
    reset()
    return current
  }

  return {
    token,
    ready: bypass || token != null,
    consume,
    reset,
    widget: { onToken: setToken, resetSignal },
  }
}

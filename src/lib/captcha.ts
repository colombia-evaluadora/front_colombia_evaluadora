import { env } from "@/config/env"

/**
 * Captcha (Cloudflare Turnstile) de los formularios públicos: login,
 * recuperación/activación de cuenta y el PDF público del boletín.
 *
 * El token viaja en el header `X-Captcha-Token` (no en el body): es lo que
 * leen auth-center, sso-admin, reporting-service y query-service con el
 * `CaptchaVerifier` compartido del SSO (common). Cada token es de UN solo uso
 * y vive 300 s, así que cada request consume uno y el widget se reinicia para
 * obtener el siguiente (`useCaptcha().consume()`).
 */
export const CAPTCHA_HEADER = "X-Captcha-Token"

/**
 * Token fijo del modo mock: con MSW no hay Cloudflare, pero los handlers de
 * `src/mocks` exigen el header igual que el backend real, así que el bypass
 * lo manda para que el contrato se pruebe de punta a punta.
 */
export const MOCK_CAPTCHA_TOKEN = "mock-captcha-token"

export const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

/**
 * Sin widget: con mocks (no hay Cloudflare en la vitrina de dev ni en los
 * tests) o con la site key vaciada a propósito (backend local con
 * `QUERY_CAPTCHA_ENABLED=false`).
 */
export function isCaptchaBypassed(): boolean {
  return env.ENABLE_API_MOCKING || !env.TURNSTILE_SITE_KEY
}

/** Token con el que arranca el hook cuando no hay widget. */
export function bypassCaptchaToken(): string {
  return env.ENABLE_API_MOCKING ? MOCK_CAPTCHA_TOKEN : ""
}

/** Headers de la request; vacío si no hay token (bypass sin mocks). */
export function captchaHeaders(token: string | null | undefined): Record<string, string> {
  return token ? { [CAPTCHA_HEADER]: token } : {}
}

export interface TurnstileRenderOptions {
  sitekey: string
  theme?: "light" | "dark" | "auto"
  language?: string
  action?: string
  size?: "normal" | "flexible" | "compact"
  "refresh-expired"?: "auto" | "manual" | "never"
  callback?: (token: string) => void
  "expired-callback"?: () => void
  "error-callback"?: (code?: string) => void
  "timeout-callback"?: () => void
}

export interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string
  reset: (widgetId?: string) => void
  remove: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null

/**
 * Carga `api.js` una sola vez (render explícito: el widget lo monta cada
 * componente). Si falla, se olvida la promesa para poder reintentar al
 * volver a montar la pantalla.
 */
export function loadTurnstile(): Promise<TurnstileApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("Sin navegador"))
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = TURNSTILE_SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile)
      else reject(new Error("Turnstile no quedó disponible"))
    }
    script.onerror = () => reject(new Error("No se pudo cargar Turnstile"))
    document.head.appendChild(script)
  }).catch((error: unknown) => {
    scriptPromise = null
    throw error
  })
  return scriptPromise
}

import { useEffect, useRef, useState } from "react"

import { useColorTheme } from "@/components/theme-provider"
import { env } from "@/config/env"
import { isCaptchaBypassed, loadTurnstile } from "@/lib/captcha"
import { cn } from "@/lib/utils"

interface TurnstileProps {
  /** Recibe cada token nuevo, o `null` cuando vence / falla / se desmonta. */
  onToken: (token: string | null) => void
  /** Cambia para pedir un token nuevo (lo incrementa `useCaptcha().reset`). */
  resetSignal: number
  /** Etiqueta del panel de Turnstile (`login`, `forgot-password`…). */
  action?: string
  className?: string
}

/**
 * Widget de Cloudflare Turnstile (modo "managed": casi siempre se resuelve
 * solo y únicamente pide interacción si Cloudflare desconfía). Idioma español
 * y tema según el modo claro/oscuro de la app. Úsese con `useCaptcha()`:
 *
 * ```tsx
 * const captcha = useCaptcha()
 * <Turnstile {...captcha.widget} action="login" />
 * <Button disabled={!captcha.ready}>…</Button>
 * mutate({ ..., captchaToken: captcha.consume() })
 * ```
 *
 * Con mocks (MSW) no renderiza nada: no hay Cloudflare y el hook ya entrega
 * un token fijo.
 */
export function Turnstile({ onToken, resetSignal, action, className }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  const { mode } = useColorTheme()
  const [loadError, setLoadError] = useState(false)
  const [widgetError, setWidgetError] = useState(false)
  const bypass = isCaptchaBypassed()

  useEffect(() => {
    onTokenRef.current = onToken
  }, [onToken])

  // Se vuelve a montar al cambiar el tema: Turnstile no permite cambiarlo en
  // caliente. El token anterior se descarta (`onToken(null)` en el cleanup).
  useEffect(() => {
    if (bypass) return
    let cancelled = false
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return
        setLoadError(false)
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: env.TURNSTILE_SITE_KEY,
          theme: mode,
          language: "es",
          action,
          size: "flexible",
          "refresh-expired": "auto",
          callback: (token) => {
            setWidgetError(false)
            onTokenRef.current(token)
          },
          "expired-callback": () => onTokenRef.current(null),
          "timeout-callback": () => onTokenRef.current(null),
          "error-callback": () => {
            setWidgetError(true)
            onTokenRef.current(null)
          },
        })
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
      if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current)
      widgetIdRef.current = null
      onTokenRef.current(null)
    }
  }, [bypass, mode, action])

  useEffect(() => {
    if (resetSignal === 0 || !widgetIdRef.current) return
    setWidgetError(false)
    window.turnstile?.reset(widgetIdRef.current)
  }, [resetSignal])

  if (bypass) return null

  return (
    <div className={cn("flex w-full flex-col items-center gap-1", className)} data-testid="captcha">
      <div ref={containerRef} className="flex min-h-[65px] w-full justify-center" />
      {loadError && (
        <p role="alert" className="text-red text-center text-xs">
          No se pudo cargar la verificación de seguridad. Revisa tu conexión y recarga la página.
        </p>
      )}
      {widgetError && !loadError && (
        <p role="alert" className="text-red text-center text-xs">
          La verificación de seguridad falló. Se reintentará automáticamente.
        </p>
      )}
    </div>
  )
}

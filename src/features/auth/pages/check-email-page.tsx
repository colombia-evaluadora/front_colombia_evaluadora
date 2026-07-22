import { useEffect, useState } from "react"
import { Link, useSearch } from "@tanstack/react-router"
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  PaperPlaneTiltIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"

import loginBg from "@/assets/login.jpg"
import logo from "@/assets/logo.svg"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { paths } from "@/config/paths"
import { useResetTokenStatus } from "@/lib/auth"
import { cn } from "@/lib/utils"

/**
 * Segundos restantes del enlace. Arranca del `expiresIn` que devolvió el
 * servidor y descuenta en el cliente: así el contador es fiel al vencimiento
 * real sin repreguntar cada segundo. Devuelve `null` mientras no se sepa
 * (sin token o consulta en vuelo).
 */
function useCountdown(expiresIn: number | undefined) {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (expiresIn === undefined) {
      setRemaining(null)
      return
    }

    const deadline = Date.now() + expiresIn * 1000
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresIn])

  return remaining
}

function formatRemaining(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, "0")}`
}

/** "14:32" — la hora a la que salió el correo. */
function formatIssuedAt(issuedAt: number): string {
  return new Date(issuedAt).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function CheckEmailPage() {
  // El token es el único dato en la URL: el email y la hora de envío salen
  // de consultarlo, no de query params.
  const token = useSearch({ from: "/check-email", select: (s) => s.token })
  const { data: tokenStatus } = useResetTokenStatus(token)
  const remaining = useCountdown(tokenStatus?.expiresIn)
  const email = tokenStatus?.email

  const isExpired =
    tokenStatus?.status === "expired" ||
    tokenStatus?.status === "invalid" ||
    remaining === 0

  return (
    <div className="relative bg-primary/5 flex min-h-screen flex-col overflow-hidden p-4">
      <div className="absolute bottom-0 right-0 z-0 h-1/2 w-full overflow-hidden bg-primary">
        <img
          src={loginBg}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover filter grayscale opacity-40 brightness-45"
        />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 px-4">
        <Link to={paths.home.getHref()}>
          <img src={logo} alt="Colombia Evaluadora" className="h-13 w-auto" />
        </Link>

        <Card className="w-full max-w-md gap-4">
          <CardHeader className="text-center">
            {/* Avión dentro del círculo + badge encima, anclado a la esquina
                inferior derecha. El badge lleva `bg-card` para recortarse. */}
            <div className="relative mx-auto size-20">
              <div
                className={cn(
                  "flex size-20 items-center justify-center rounded-full",
                  isExpired ? "bg-destructive/10" : "bg-success/10"
                )}
              >
                <PaperPlaneTiltIcon
                  className={cn(
                    "size-9",
                    isExpired ? "text-destructive" : "text-success"
                  )}
                  aria-hidden="true"
                />
              </div>
              {isExpired ? (
                <WarningCircleIcon
                  weight="fill"
                  className="text-destructive bg-card absolute right-0 bottom-0 size-7 rounded-full"
                  aria-hidden="true"
                />
              ) : (
                <CheckCircleIcon
                  weight="fill"
                  className="text-success bg-card absolute right-0 bottom-0 size-7 rounded-full"
                  aria-hidden="true"
                />
              )}
            </div>

            <CardTitle className="text-xl">
              {isExpired ? "El enlace expiró" : "¡Instrucciones enviadas!"}
            </CardTitle>
            <CardDescription>
              {isExpired ? (
                "Por seguridad el enlace dejó de ser válido. Solicita uno nuevo para restablecer tu contraseña."
              ) : (
                <>
                  Hemos enviado un correo a
                  {email ? (
                    <>
                      <br />
                      <span className="text-success font-semibold break-all">
                        {email}
                      </span>
                    </>
                  ) : (
                    " tu dirección registrada"
                  )}
                </>
              )}
            </CardDescription>
          </CardHeader>

          {!isExpired && (
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-center text-sm">
                Sigue las instrucciones del correo para restablecer tu
                contraseña.
                {remaining === null
                  ? " El enlace será válido por 30 minutos."
                  : null}
              </p>

              {remaining !== null && (
                <div className="bg-success/10 flex items-center justify-center gap-2 p-3">
                  <ClockIcon
                    weight="duotone"
                    className="text-success size-5 shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-sm">
                    El enlace vence en{" "}
                    <span
                      className="text-success font-semibold tabular-nums"
                      // Solo el tiempo se relee; sin esto un lector de
                      // pantalla anunciaría la frase entera cada segundo.
                      aria-live="polite"
                    >
                      {formatRemaining(remaining)}
                    </span>
                  </p>
                </div>
              )}

              {tokenStatus?.issuedAt !== undefined && (
                <p className="text-muted-foreground text-center text-xs">
                  Enviado a las {formatIssuedAt(tokenStatus.issuedAt)}
                </p>
              )}

              <div className="bg-success/10 flex items-start gap-3 p-4">
                <CheckCircleIcon
                  weight="fill"
                  className="text-success mt-0.5 size-5 shrink-0"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <p className="text-sm font-semibold">
                    Revisa tu bandeja de entrada
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Si no encuentras el correo, revisa tu carpeta de spam o
                    correo no deseado.
                  </p>
                </div>
              </div>
            </CardContent>
          )}

          <CardFooter className="flex flex-col gap-2">
            {isExpired && (
              <Button
                render={<Link to={paths.auth.forgotPassword.path} />}
                nativeButton={false}
                color="primary"
                className="w-full"
              >
                Solicitar un enlace nuevo
              </Button>
            )}

            <Button
              render={<Link to={paths.auth.login.path} />}
              nativeButton={false}
              variant="outline"
              className="w-full"
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Volver al inicio de sesión
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

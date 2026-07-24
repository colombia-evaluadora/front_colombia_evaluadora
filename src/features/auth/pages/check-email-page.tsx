import { Link, useSearch } from "@tanstack/react-router"
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  PaperPlaneTiltIcon,
  WarningCircleIcon,
} from "@/components/ui/icons"

import { Button } from "@/components/ui/button"
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { paths } from "@/config/paths"
import { cn } from "@/lib/utils"

import { usePasswordResetLink } from "../hooks/use-password-reset-link"

export function CheckEmailPage() {
  // El token es el único dato en la URL: el correo, la hora de envío y el
  // tiempo restante salen de consultarlo.
  const token = useSearch({
    from: "/_auth/check-email",
    select: (s) => s.token,
  })
  const {
    isExpired,
    isInvalid,
    maskedEmail,
    issuedAtLabel,
    remainingLabel,
    ttlLabel,
  } = usePasswordResetLink(token)

  const isDead = isExpired || (isInvalid && !!token)

  return (
    <>
      <CardHeader className="text-center">
        <div className="relative mx-auto size-20">
          <div
            className={cn(
              "flex size-20 items-center justify-center rounded-full",
              isDead ? "bg-destructive/10" : "bg-success/10"
            )}
          >
            <PaperPlaneTiltIcon
              className={cn(
                "size-9",
                isDead ? "text-destructive" : "text-success"
              )}
              aria-hidden="true"
            />
          </div>
          {isDead ? (
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
          {isDead ? "El enlace expiró" : "¡Instrucciones enviadas!"}
        </CardTitle>
        <CardDescription>
          {isDead ? (
            "Por seguridad el enlace dejó de ser válido. Solicita uno nuevo para restablecer tu contraseña."
          ) : (
            <>
              Hemos enviado un correo a
              {maskedEmail ? (
                <>
                  <br />
                  <span className="text-success font-semibold break-all">
                    {maskedEmail}
                  </span>
                </>
              ) : (
                " tu dirección registrada"
              )}
            </>
          )}
        </CardDescription>
      </CardHeader>

      {!isDead && (
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-center text-sm">
            Sigue las instrucciones del correo para restablecer tu contraseña.
            {remainingLabel === null && ttlLabel !== null
              ? ` El enlace será válido por ${ttlLabel}.`
              : null}
          </p>

          {remainingLabel !== null && (
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
                  aria-live="polite"
                >
                  {remainingLabel}
                </span>
              </p>
            </div>
          )}

          {issuedAtLabel !== null && (
            <p className="text-muted-foreground text-center text-xs">
              Enviado a las {issuedAtLabel}
            </p>
          )}

          <div className="bg-success/10 flex items-start gap-3 p-4">
            <CheckCircleIcon
              weight="fill"
              className="text-success mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Revisa tu bandeja de entrada</p>
              <p className="text-muted-foreground text-sm">
                Si no encuentras el correo, revisa tu carpeta de spam o correo
                no deseado.
              </p>
            </div>
          </div>
        </CardContent>
      )}

      <CardFooter className="flex flex-col gap-2">
        {isDead && (
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
    </>
  )
}

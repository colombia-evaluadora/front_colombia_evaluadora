import { useEffect, useState } from "react"
import {
  ArrowLeftIcon,
  ClockCountdownIcon,
  LinkBreakIcon,
  ShieldCheckIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

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
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"
import {
  resetTokenStatusQueryKey,
  useResetTokenStatus,
  useRestorePassword,
} from "@/lib/auth"

import { RestorePasswordForm } from "../components/forms/form-restore-password"
import type { RestorePasswordFormValues } from "../api/schema"

const RESTORE_PASSWORD_FORM_ID = "restore-password-form"

/**
 * Segundos restantes del enlace. Arranca del `expiresIn` que devolvió el
 * servidor y descuenta contra un `deadline` fijo, así que no acumula drift
 * ni pide nada: el vencimiento se detecta del lado del cliente. Devuelve
 * `null` mientras no se sepa.
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

export function RestorePasswordPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const token = useSearch({
    from: "/restore-password",
    select: (s) => s.token,
  })

  // El estado del token se consulta antes de mostrar el formulario, para no
  // hacer escribir una contraseña que el submit va a rechazar igual.
  const { data: tokenStatus, isPending: isCheckingToken } =
    useResetTokenStatus(token)

  // El contador corre en el cliente: cuando llega a cero cambiamos la card
  // sin volver a preguntarle al servidor. El submit revalida igual.
  const remaining = useCountdown(
    tokenStatus?.status === "valid" ? tokenStatus.expiresIn : undefined
  )
  const isExpired = tokenStatus?.status === "expired" || remaining === 0

  const restorePasswordMutation = useRestorePassword({
    mutationConfig: {
      onSuccess: () => {
        toast.success("Contraseña actualizada. Ya puedes iniciar sesión.")
        navigate({ to: paths.auth.login.path })
      },
      onError: () => {
        queryClient.invalidateQueries({
          queryKey: resetTokenStatusQueryKey(token),
        })
      },
    },
  })

  function handleSubmit(values: RestorePasswordFormValues) {
    if (!token) return
    restorePasswordMutation.mutate({ token, password: values.password })
  }

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
          <img
            src={logo}
            alt="Colombia Evaluadora"
            className="h-13 w-auto"
          />
        </Link>

        <Card className="w-full max-w-md gap-4">
          {!token || tokenStatus?.status === "invalid" ? (
            <>
              <CardHeader className="text-center">
                <div className="relative mx-auto size-20">
                  <div className="bg-destructive/10 flex size-20 items-center justify-center rounded-full">
                    <LinkBreakIcon
                      className="text-destructive size-9"
                      aria-hidden="true"
                    />
                  </div>
                  <WarningCircleIcon
                    weight="fill"
                    className="text-destructive bg-card absolute right-0 bottom-0 size-7 rounded-full"
                    aria-hidden="true"
                  />
                </div>
                <CardTitle>Enlace inválido</CardTitle>
                <CardDescription>
                  Este enlace de recuperación no es válido. Solicita uno nuevo
                  para restablecer tu contraseña.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  render={<Link to={paths.auth.forgotPassword.path} />}
                  nativeButton={false}
                  color="primary"
                  className="w-full"
                >
                  Solicitar nuevo enlace
                </Button>
              </CardFooter>
            </>
          ) : isExpired ? (
            <>
              <CardHeader className="text-center">
                <div className="relative mx-auto size-20">
                  <div className="bg-destructive/10 flex size-20 items-center justify-center rounded-full">
                    <ClockCountdownIcon
                      className="text-destructive size-9"
                      aria-hidden="true"
                    />
                  </div>
                  <WarningCircleIcon
                    weight="fill"
                    className="text-destructive bg-card absolute right-0 bottom-0 size-7 rounded-full"
                    aria-hidden="true"
                  />
                </div>
                <CardTitle>El enlace expiró</CardTitle>
                <CardDescription>
                  Por seguridad, los enlaces de recuperación vencen a los 30
                  minutos. Solicita uno nuevo para continuar.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  render={<Link to={paths.auth.forgotPassword.path} />}
                  nativeButton={false}
                  color="primary"
                  className="w-full"
                >
                  Solicitar nuevo enlace
                </Button>
              </CardFooter>
            </>
          ) : isCheckingToken ? (
            <CardContent className="flex justify-center py-10">
              <Spinner className="size-6" />
            </CardContent>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle>Restablecer contraseña</CardTitle>
                <CardDescription>
                  Ingresa tu nueva contraseña.
                  {remaining !== null && (
                    <>
                      <br />
                      Este enlace vence en{" "}
                      <span
                        className="font-semibold tabular-nums"
                        // Solo el tiempo se relee; sin esto un lector de
                        // pantalla anunciaría la frase entera cada segundo.
                        aria-live="polite"
                      >
                        {formatRemaining(remaining)}
                      </span>
                    </>
                  )}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <RestorePasswordForm
                  id={RESTORE_PASSWORD_FORM_ID}
                  onSubmit={handleSubmit}
                />
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                <Button
                  type="submit"
                  color="primary"
                  form={RESTORE_PASSWORD_FORM_ID}
                  disabled={restorePasswordMutation.isPending}
                  className="w-full"
                >
                  Guardar contraseña
                </Button>

                <Button
                  render={<Link to={paths.auth.login.path} />}
                  nativeButton={false}
                  variant="link"
                  color="secondary"
                >
                  <ArrowLeftIcon data-icon="inline-start" />
                  Volver a iniciar sesión
                </Button>
                <p className="text-muted-foreground inline-flex items-start text-center text-xs">
                  <ShieldCheckIcon
                    weight="duotone"
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                  Tu seguridad es importante. Nunca compartas tu contraseña con nadie.
                </p>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

import { ArrowLeftIcon, ShieldCheckIcon } from "@phosphor-icons/react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
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
import { paths } from "@/config/paths"
import { useRestorePassword } from "@/lib/auth"

import { RestorePasswordForm } from "../components/forms/form-restore-password"
import type { RestorePasswordFormValues } from "../api/schema"

const RESTORE_PASSWORD_FORM_ID = "restore-password-form"

export function RestorePasswordPage() {
  const navigate = useNavigate()
  const token = useSearch({
    from: "/restore-password",
    select: (s) => s.token,
  })

  const restorePasswordMutation = useRestorePassword({
    mutationConfig: {
      onSuccess: () => {
        toast.success("Contraseña actualizada. Ya puedes iniciar sesión.")
        navigate({ to: paths.auth.login.path })
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
          {!token ? (
            <>
              <CardHeader className="text-center">
                <CardTitle>Enlace inválido</CardTitle>
                <CardDescription>
                  Este enlace de recuperación no es válido o ya expiró.
                  Solicita uno nuevo.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  render={<Link to={paths.auth.forgotPassword.path} />}
                  nativeButton={false}
                  className="w-full"
                >
                  Solicitar nuevo enlace
                </Button>
              </CardFooter>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle>Restablecer contraseña</CardTitle>
                <CardDescription>
                  Ingresa tu nueva contraseña.
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

import { ArrowLeftIcon } from "@phosphor-icons/react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { toast } from "sonner"

import icon from "@/assets/icon.svg"
import loginBg from "@/assets/login.jpg"
import logo from "@/assets/logo.svg"
import { Button } from "@/components/ui/button"
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
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col p-6 md:p-10">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            render={<Link to={paths.auth.login.path} />}
            nativeButton={false}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Volver
          </Button>
          <Link to={paths.home.getHref()}>
            <img src={logo} alt="Colombia Evaluadora" className="h-10 w-auto" />
          </Link>

          <div className="w-30" />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-sm space-y-6">
            {!token ? (
              <div className="space-y-4 text-center">
                <h1 className="font-heading text-2xl font-semibold">Enlace inválido</h1>
                <p className="text-sm text-muted-foreground">
                  Este enlace de recuperación no es válido o ya expiró.
                  Solicita uno nuevo.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  render={<Link to={paths.auth.forgotPassword.path} />}
                  nativeButton={false}
                >
                  Solicitar nuevo enlace
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-1 text-center">
                  <h1 className="font-heading text-2xl font-semibold">
                    Restablecer contraseña
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Ingresa tu nueva contraseña.
                  </p>
                </div>

                <RestorePasswordForm
                  id={RESTORE_PASSWORD_FORM_ID}
                  onSubmit={handleSubmit}
                />

                <Button
                  type="submit"
                  form={RESTORE_PASSWORD_FORM_ID}
                  disabled={restorePasswordMutation.isPending}
                  className="w-full"
                >
                  {restorePasswordMutation.isPending
                    ? "Guardando..."
                    : "Guardar contraseña"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      <div
        className="relative hidden overflow-hidden bg-cover bg-center lg:flex lg:items-center lg:justify-center"
        style={{ backgroundImage: `url(${loginBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#7e14ff]/80 to-[#47bfff]/80" />
        <img src={icon} alt="" className="relative size-40 drop-shadow-2xl" />
      </div>
    </div>
  )
}

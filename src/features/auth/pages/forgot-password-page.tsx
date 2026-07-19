import { useState } from "react"
import { ArrowLeftIcon } from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"

import icon from "@/assets/icon.svg"
import loginBg from "@/assets/login.jpg"
import logo from "@/assets/logo.svg"
import { Button } from "@/components/ui/button"
import { paths } from "@/config/paths"
import { useForgotPassword } from "@/lib/auth"

import { ForgotPasswordForm } from "../components/forms/form-forgot-password"
import type { ForgotPasswordFormValues } from "../api/schema"

const FORGOT_PASSWORD_FORM_ID = "forgot-password-form"

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const forgotPasswordMutation = useForgotPassword()

  function handleSubmit(values: ForgotPasswordFormValues) {
    forgotPasswordMutation.mutate(values.email, {
      // Igual que admin-ui: nunca se revela si el email existe o no, así
      // que la confirmación se muestra sin importar éxito o error.
      onSettled: () => setSubmitted(true),
    })
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
            {submitted ? (
              <div className="space-y-4 text-center">
                <h1 className="font-heading text-2xl font-semibold">Revisa tu correo</h1>
                <p className="text-sm text-muted-foreground">
                  Si el email está registrado, te enviamos un enlace para
                  restablecer tu contraseña.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  render={<Link to={paths.auth.login.path} />}
                  nativeButton={false}
                >
                  Volver a iniciar sesión
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-1 text-center">
                  <h1 className="font-heading text-2xl font-semibold">
                    ¿Olvidaste tu contraseña?
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Ingresa tu email y te enviaremos un enlace para
                    restablecerla.
                  </p>
                </div>

                <ForgotPasswordForm
                  id={FORGOT_PASSWORD_FORM_ID}
                  onSubmit={handleSubmit}
                />

                <Button
                  type="submit"
                  form={FORGOT_PASSWORD_FORM_ID}
                  disabled={forgotPasswordMutation.isPending}
                  className="w-full"
                >
                  {forgotPasswordMutation.isPending
                    ? "Enviando..."
                    : "Enviar enlace"}
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

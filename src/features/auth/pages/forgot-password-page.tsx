import { useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
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
import { useForgotPassword } from "@/lib/auth"

import { ForgotPasswordForm } from "../components/forms/form-forgot-password"
import type { ForgotPasswordFormValues } from "../api/schema"

const FORGOT_PASSWORD_FORM_ID = "forgot-password-form"

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const forgotPasswordMutation = useForgotPassword()

  // Misma política que admin-ui: nunca se revela si el email existe o no,
  // así que la confirmación se muestra sin importar éxito o error.
  function handleSubmit(values: ForgotPasswordFormValues) {
    forgotPasswordMutation.mutate(values.email, {
      onSettled: () => setSubmitted(true),
    })
  }

  useEffect(() => {
    // Si el usuario ya recibió el cartel y vuelve a empezar (ej. corrigió
    // un typo y volvió a tipear en el form), resetea el cartel. El listener
    // cambia de valor solo cuando el passwordMutation vuelve al idle.
    if (
      submitted &&
      !forgotPasswordMutation.isPending &&
      forgotPasswordMutation.isSuccess
    ) {
      setSubmitted(false)
    }
  }, [forgotPasswordMutation.isPending, forgotPasswordMutation.isSuccess, submitted])

  return (
    // `relative` sobre el contenedor, no sobre el `<img>`, para que la
    // imagen absoluta quede dentro del flujo de este árbol. `bg-primary`
    // es el color que se ve "alrededor" del Card.
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
          {submitted ? (
            <>
              <CardHeader className="text-center">
                <CheckCircleIcon
                  weight="duotone"
                  className="text-success mx-auto size-10"
                  aria-hidden="true"
                />
                <CardTitle>Revisa tu correo</CardTitle>
                <CardDescription>
                  Si el email está registrado, te enviamos un enlace para
                  restablecer tu contraseña.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  render={<Link to={paths.auth.login.path} />}
                  nativeButton={false}
                  className="w-full"
                >
                  Volver a iniciar sesión
                </Button>
              </CardFooter>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle>¿Olvidaste tu contraseña?</CardTitle>
                <CardDescription>
                  Ingresa tu email y te enviaremos un enlace para
                  restablecerla.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ForgotPasswordForm
                  id={FORGOT_PASSWORD_FORM_ID}
                  onSubmit={handleSubmit}
                />
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                <Button
                  type="submit"
                  color="primary"
                  form={FORGOT_PASSWORD_FORM_ID}
                  disabled={forgotPasswordMutation.isPending}
                  className="w-full"
                >
                  Enviar enlace
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

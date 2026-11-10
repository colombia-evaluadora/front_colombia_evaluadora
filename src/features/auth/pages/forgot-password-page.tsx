import { Link } from "@tanstack/react-router"
import { ArrowLeftIcon, ArrowRightIcon, EnvelopeIcon, PasswordIcon, ShieldIcon } from "@/components/ui/icons"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Turnstile } from "@/components/captcha/turnstile"
import { paths } from "@/config/paths"
import { useCaptcha } from "@/hooks/use-captcha"

import { useForgotPassword } from "@/features/auth/api/mutations/forgot-password"
import { ForgotPasswordForm } from "@/features/auth/components/forms/form-forgot-password"
import type { ForgotPasswordFormValues } from "@/features/auth/api/schema"

const FORGOT_PASSWORD_FORM_ID = "forgot-password-form"

/**
 * ¿Olvidó su contraseña? ("[admin] Acceso y sesiones"): con correo o documento
 * y una sola respuesta, exista o no la cuenta. El backend limita a 3 envíos por
 * hora y no envía durante 24 h después de un cambio de correo; nada de eso se
 * le dice a la persona, para no dar pistas.
 */
export function ForgotPasswordPage() {
  const forgotPasswordMutation = useForgotPassword()
  const captcha = useCaptcha()
  const enviado = forgotPasswordMutation.isSuccess

  function handleSubmit(values: ForgotPasswordFormValues) {
    if (!captcha.ready) return
    // El token es de un solo uso: `consume()` reinicia el widget en el mismo
    // paso, así un reintento tras un error ya espera a uno nuevo.
    forgotPasswordMutation.mutate({ identificador: values.email, captchaToken: captcha.consume() })
  }

  return (
    <>
      <CardHeader className="text-center">
        <div className="bg-primary/10 mx-auto flex size-14 items-center justify-center rounded-full">
          <PasswordIcon className="text-primary size-7" aria-hidden="true" />
        </div>
        <CardTitle>¿Olvidó su contraseña?</CardTitle>
        <CardDescription>
          Escriba su correo o su número de documento y le enviaremos un enlace para crear una
          contraseña nueva.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {enviado ? (
          <Alert>
            <EnvelopeIcon aria-hidden="true" />
            <AlertTitle>Revise su correo</AlertTitle>
            <AlertDescription>
              Si los datos corresponden a una cuenta activa, enviamos un enlace al correo registrado.
              El enlace vale 1 hora y sirve una sola vez. Si no llega en unos minutos, revise la
              carpeta de correo no deseado.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <ForgotPasswordForm id={FORGOT_PASSWORD_FORM_ID} onSubmit={handleSubmit} />
            <Turnstile {...captcha.widget} action="forgot-password" />
          </>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {!enviado && (
          <Button
            type="submit"
            color="primary"
            form={FORGOT_PASSWORD_FORM_ID}
            disabled={forgotPasswordMutation.isPending || !captcha.ready}
            className="w-full"
          >
            Enviar enlace
            {forgotPasswordMutation.isPending ? (
              <Spinner data-icon="inline-end" />
            ) : (
              <ArrowRightIcon data-icon="inline-end" />
            )}
          </Button>
        )}
        <Button
          render={<Link to={paths.auth.login.path} />}
          nativeButton={false}
          variant="ghost"
          color="primary"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Volver a iniciar sesión
        </Button>
        <p className="text-muted-foreground inline-flex items-start text-center text-xs">
          <ShieldIcon className="size-5 shrink-0" aria-hidden="true" />
          Nunca comparta su contraseña con nadie.
        </p>
      </CardFooter>
    </>
  )
}

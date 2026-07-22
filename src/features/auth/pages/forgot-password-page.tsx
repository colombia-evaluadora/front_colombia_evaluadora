import { Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeftIcon, ShieldCheckIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { paths } from "@/config/paths"

import { useForgotPassword } from "../api/mutations/forgot-password"
import { ForgotPasswordForm } from "../components/forms/form-forgot-password"
import type { ForgotPasswordFormValues } from "../api/schema"

const FORGOT_PASSWORD_FORM_ID = "forgot-password-form"

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const forgotPasswordMutation = useForgotPassword()

  function handleSubmit(values: ForgotPasswordFormValues) {
    forgotPasswordMutation.mutate(values.email, {
      onSettled: (data) =>
        navigate({
          to: paths.auth.checkEmail.path,
          search: { token: data?.token },
        }),
    })
  }

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle>¿Olvidaste tu contraseña?</CardTitle>
        <CardDescription>
          Ingresa tu email y te enviaremos un enlace para restablecerla.
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
  )
}

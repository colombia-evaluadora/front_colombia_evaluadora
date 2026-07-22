import { useEffect } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { ShieldCheckIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { paths } from "@/config/paths"
import { useLogin } from "@/lib/auth"

import { HelpFaqSheet } from "../components/sheets/sheet-help-faq"
import { LoginForm } from "../components/forms/form-login"
import type { LoginFormValues } from "../api/schema"

const LOGIN_FORM_ID = "login-form"

export function LoginPage() {
  const navigate = useNavigate()
  const search = useSearch({
    from: "/_auth/login",
    select: (s) => s.redirectTo,
  })

  const loginMutation = useLogin()

  useEffect(() => {
    if (loginMutation.isSuccess) {
      navigate({ to: search || paths.app.root.getHref() })
    }
  }, [loginMutation.isSuccess, navigate, search])

  function handleSubmit(values: LoginFormValues) {
    loginMutation.mutate(values)
  }

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Ingresa tus credenciales para acceder.</CardDescription>
      </CardHeader>

      <CardContent>
        <LoginForm id={LOGIN_FORM_ID} onSubmit={handleSubmit} />
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        <Button
          type="submit"
          color="primary"
          form={LOGIN_FORM_ID}
          disabled={loginMutation.isPending}
          className="w-full"
        >
          Ingresar
        </Button>
        <HelpFaqSheet />
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

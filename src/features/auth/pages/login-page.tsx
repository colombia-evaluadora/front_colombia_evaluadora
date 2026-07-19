import { useEffect } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"

import icon from "@/assets/icon.svg"
import loginBg from "@/assets/login.jpg"
import logo from "@/assets/logo.svg"
import { Button } from "@/components/ui/button"
import { paths } from "@/config/paths"
import { useLogin } from "@/lib/auth"

import { LoginForm } from "../components/forms/form-login"
import type { LoginFormValues } from "../api/schema"

const LOGIN_FORM_ID = "login-form"

export function LoginPage() {
  const navigate = useNavigate()
  const search = useSearch({ from: "/login", select: (s) => s.redirectTo })

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
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col p-6 md:p-10">
        <div className="flex items-center justify-center">
      
          <Link to={paths.home.getHref()}>
            <img src={logo} alt="Colombia Evaluadora" className="h-10 w-auto" />
          </Link>


        </div>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-1 text-center">
              <h1 className="font-heading text-2xl font-semibold">Iniciar sesión</h1>
              <p className="text-sm text-muted-foreground">
                Ingresa tus credenciales para acceder.
              </p>
            </div>

            <LoginForm id={LOGIN_FORM_ID} onSubmit={handleSubmit} />

            <div className="text-right text-sm">
              <Link
                to={paths.auth.forgotPassword.path}
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Button
              type="submit"
              color="primary"
              form={LOGIN_FORM_ID}
              disabled={loginMutation.isPending}
              className="w-full"
            >
              {loginMutation.isPending ? "Ingresando..." : "Ingresar"}
            </Button>
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

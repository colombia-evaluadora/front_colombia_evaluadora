import { useEffect } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { ShieldCheckIcon } from "@phosphor-icons/react"

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
import { useLogin } from "@/lib/auth"

import { HelpFaqSheet } from "../components/sheets/sheet-help-faq"
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
    // `relative` sobre el contenedor, no sobre el `<img>`, para que la imagen
    // absoluta quede dentro del flujo de este árbol. `bg-primary` es el color
    // que se ve "alrededor" del Card cuando el `<img>` no llena (al cargar,
    // o en pantallas anchas vs. la imagen).
    <div className="relative flex min-h-screen bg-primary/5 flex-col overflow-hidden p-4">
      {/* Imagen de fondo a pantalla completa. `absolute inset-0` la estira a
          todo el viewport; `object-cover` la recorta sin deformar. */}
      <div className="absolute bottom-0 right-0 z-0 h-1/2 w-full overflow-hidden bg-primary">
        <img
          src={loginBg}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover filter grayscale opacity-40 brightness-45"
        />
      </div>

      {/* Logo y Card juntos, centrados en ambos ejes. `flex-1` sobre el hijo
          que contiene el logo hace que el bloque "logo + Card" ocupe la
          pantalla entera, y `items-center justify-center` lo centra. */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 px-4">
        <Link to={paths.home.getHref()}>
          <img
            src={logo}
            alt="Colombia Evaluadora"
            className="h-13 w-auto"
          />
        </Link>

        <Card className="w-full max-w-md gap-4">
          <CardHeader className="text-center">
            <CardTitle>Iniciar sesión</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <LoginForm id={LOGIN_FORM_ID} onSubmit={handleSubmit} />
          </CardContent>

          <CardFooter className="flex flex-col gap-2">
            <Button
              render={<Link to={paths.auth.forgotPassword.path} />}
              nativeButton={false}
              className="self-center sm:self-auto sm:ml-auto"
              variant="link"
              color="muted"
            >
              <span>¿Olvidaste tu contraseña?</span>
            </Button>
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
        </Card>
      </div>
    </div>
  )
}

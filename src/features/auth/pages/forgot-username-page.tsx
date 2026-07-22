import { useState } from "react"
import { Link } from "@tanstack/react-router"
import {
  ArrowLeftIcon,
  IdentificationCardIcon,
  ShieldCheckIcon,
  UserCircleIcon,
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
import { useForgotUsername, type ForgotUsernameResponse } from "@/lib/auth"

import { ForgotUsernameForm } from "../components/forms/form-forgot-username"
import type { ForgotUsernameFormValues } from "../api/schema"

const FORGOT_USERNAME_FORM_ID = "forgot-username-form"

export function ForgotUsernamePage() {
  const [found, setFound] = useState<ForgotUsernameResponse | null>(null)
  const forgotUsernameMutation = useForgotUsername({
    mutationConfig: {
      onSuccess: (data) => setFound(data),
    },
  })

  function handleSubmit(values: ForgotUsernameFormValues) {
    forgotUsernameMutation.mutate(values.email)
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
          <img src={logo} alt="Colombia Evaluadora" className="h-13 w-auto" />
        </Link>

        <Card className="w-full max-w-md gap-4">
          {found ? (
            <>
              <CardHeader className="text-center">
                <div className="relative mx-auto size-20">
                  <div className="bg-success/10 flex size-20 items-center justify-center rounded-full">
                    <UserCircleIcon
                      className="text-success size-9"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <CardTitle className="text-xl">Este es tu usuario</CardTitle>
                <CardDescription>
                  Encontramos la cuenta asociada a{" "}
                  <span className="font-semibold break-all">
                    {found.maskedEmail}
                  </span>
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="bg-success/10 flex flex-col items-center gap-1 p-4 text-center">
                  <p className="text-muted-foreground text-xs">Tu usuario es</p>
                  <p className="text-success text-lg font-semibold break-all">
                    {found.username}
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                <Button
                  render={<Link to={paths.auth.login.path} />}
                  nativeButton={false}
                  color="primary"
                  className="w-full"
                >
                  Iniciar sesión
                </Button>
                <Button
                  render={<Link to={paths.auth.forgotPassword.path} />}
                  nativeButton={false}
                  variant="link"
                  color="secondary"
                >
                  Tampoco recuerdo mi contraseña
                </Button>
              </CardFooter>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <div className="relative mx-auto size-20">
                  <div className="bg-primary/10 flex size-20 items-center justify-center rounded-full">
                    <IdentificationCardIcon
                      className="text-primary size-9"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <CardTitle>¿No recuerdas tu usuario?</CardTitle>
                <CardDescription>
                  Ingresa el correo registrado y te decimos con qué usuario
                  entras.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ForgotUsernameForm
                  id={FORGOT_USERNAME_FORM_ID}
                  onSubmit={handleSubmit}
                />
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                <Button
                  type="submit"
                  color="primary"
                  form={FORGOT_USERNAME_FORM_ID}
                  disabled={forgotUsernameMutation.isPending}
                  className="w-full"
                >
                  Consultar usuario
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

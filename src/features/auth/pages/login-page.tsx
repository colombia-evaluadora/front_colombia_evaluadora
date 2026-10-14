import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { ArrowRightIcon, ShieldLockIcon, ShieldIcon } from "@/components/ui/icons"

import { Button } from "@/components/ui/button"
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"
import { enterOfflineSession, getOfflineContinueName, useLogin } from "@/lib/auth"
import { setDeviceMode } from "@/lib/offline/query-persister"
import { useConnectivity } from "@/lib/offline/use-connectivity"

import { HelpFaqSheet } from "@/features/auth/components/sheets/sheet-help-faq"
import { LoginForm } from "@/features/auth/components/forms/form-login"
import type { LoginFormValues } from "@/features/auth/api/schema"

const LOGIN_FORM_ID = "login-form"

export function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const search = useSearch({
    from: "/_auth/login",
    select: (s) => s.redirectTo,
  })

  const loginMutation = useLogin()
  const isOffline = useConnectivity().status === "offline"

  // "Continuar sin conexión como {nombre}": solo con red caída, equipo
  // personal y una `session` de ≤ 14 días (lo decide `getOfflineContinueName`).
  const { data: offlineName } = useQuery({
    queryKey: ["offline", "continue-name"],
    queryFn: getOfflineContinueName,
    enabled: isOffline,
    networkMode: "always",
    gcTime: 0,
  })

  const continueOffline = useMutation({
    mutationFn: () => enterOfflineSession(queryClient),
    networkMode: "always",
    onSuccess: (user) => {
      if (user) navigate({ to: search || paths.app.root.getHref() })
    },
  })

  useEffect(() => {
    if (loginMutation.isSuccess) {
      navigate({ to: search || paths.app.root.getHref() })
    }
  }, [loginMutation.isSuccess, navigate, search])

  async function handleSubmit({ sharedDevice, ...values }: LoginFormValues) {
    // El modo del equipo se fija ANTES del login: en "compartido" no se
    // persiste nada (y se borra lo que hubiera) desde la primera respuesta.
    await setDeviceMode(sharedDevice ? "compartido" : "personal").catch(() => undefined)
    loginMutation.mutate(values)
  }

  return (
    <>
      <CardHeader className="text-center">
        <div className="bg-primary/10 mx-auto flex size-14 items-center justify-center rounded-full">
          <ShieldLockIcon className="text-primary size-7" aria-hidden="true" />
        </div>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Accede con tu cuenta institucional.</CardDescription>
      </CardHeader>

      <CardContent>
        <LoginForm id={LOGIN_FORM_ID} onSubmit={handleSubmit} />
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {isOffline && (
          <p role="status" className="text-muted-foreground text-center text-sm">
            {offlineName
              ? "Necesitas conexión para iniciar sesión."
              : "Necesitas conexión para iniciar sesión por primera vez en este equipo."}
          </p>
        )}
        <Button
          type="submit"
          color="primary"
          form={LOGIN_FORM_ID}
          disabled={loginMutation.isPending || isOffline}
          className="w-full"
        >
          Ingresar
          {loginMutation.isPending ? (
            <Spinner data-icon="inline-end" />
          ) : (
            <ArrowRightIcon data-icon="inline-end" />
          )}
        </Button>
        {isOffline && offlineName && (
          <Button
            type="button"
            variant="outline"
            color="primary"
            className="w-full"
            disabled={continueOffline.isPending}
            onClick={() => continueOffline.mutate()}
          >
            Continuar sin conexión como {offlineName}
          </Button>
        )}
        <div className="flex w-full items-center gap-3">
          <Separator className="flex-1" />
          <HelpFaqSheet />
          <Separator className="flex-1" />
        </div>
        <p className="text-muted-foreground inline-flex items-start text-center text-xs">
          <ShieldIcon className="size-5 shrink-0" aria-hidden="true" />
          Tu seguridad es importante. Nunca compartas tu contraseña con nadie.
        </p>
      </CardFooter>
    </>
  )
}

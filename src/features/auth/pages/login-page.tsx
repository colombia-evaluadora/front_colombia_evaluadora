import { useEffect, useState } from "react"
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
import { Turnstile } from "@/components/captcha/turnstile"
import { paths } from "@/config/paths"
import { useCaptcha } from "@/hooks/use-captcha"
import { enterOfflineSession, getOfflineContinueInfo, unlockOfflineSession, useLogin } from "@/lib/auth"
import { toAuthUserFromToken } from "@/lib/auth-mapper"
import { canUsePersonalDevice, isInstalledPersonalDevice, isPersonalDeviceAllowed } from "@/lib/offline/device-policy"
import { saveLocalCredential } from "@/lib/offline/local-credential"
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
  // Captcha solo para el login en línea: el desbloqueo sin conexión se
  // verifica en el equipo y no llega al backend.
  const captcha = useCaptcha()
  const [unlockError, setUnlockError] = useState<string | null>(null)

  // "Continuar sin conexión como {nombre}": solo con red caída, equipo
  // personal y una `session` vigente (lo decide `getOfflineContinueInfo`).
  // Tras "Cerrar sesión" en la app instalada (D-12) la sesión queda BLOQUEADA:
  // sin PIN se entra escribiendo la contraseña (verificada en el equipo); con
  // PIN se entra y la bóveda lo pide.
  const { data: offlineInfo } = useQuery({
    queryKey: ["offline", "continue-info"],
    queryFn: getOfflineContinueInfo,
    enabled: isOffline,
    networkMode: "always",
    gcTime: 0,
  })
  const offlineName = offlineInfo?.name ?? null
  const needsPassword = !!offlineInfo?.locked && !offlineInfo.hasPin
  const canUnlockWithPassword = needsPassword && !!offlineInfo?.hasCredential

  const goToApp = () => navigate({ to: search || paths.app.root.getHref() })

  const continueOffline = useMutation({
    mutationFn: () => enterOfflineSession(queryClient, { unlocked: !!offlineInfo?.locked }),
    networkMode: "always",
    onSuccess: (user) => {
      if (user) goToApp()
    },
  })

  const unlockOffline = useMutation({
    mutationFn: (values: { email: string; password: string }) => unlockOfflineSession(queryClient, values),
    networkMode: "always",
    onSuccess: (user) => {
      if (user) goToApp()
      else
        setUnlockError(
          `Sin conexión solo puede entrar ${offlineName ?? "la última cuenta que usó este equipo"}, con la última contraseña que usó aquí con internet.`,
        )
    },
  })

  useEffect(() => {
    if (loginMutation.isSuccess) {
      navigate({ to: search || paths.app.root.getHref() })
    }
  }, [loginMutation.isSuccess, navigate, search])

  async function handleSubmit({ sharedDevice, ...values }: LoginFormValues) {
    // Sin red solo se puede desbloquear lo que ya está en el equipo.
    if (isOffline) {
      if (!canUnlockWithPassword) return
      setUnlockError(null)
      unlockOffline.mutate({ email: values.email, password: values.password })
      return
    }
    if (!captcha.ready) return
    // Token de un solo uso: se toma ANTES de cualquier await para que dos
    // envíos seguidos no manden el mismo, y el widget se reinicia ya.
    const captchaToken = captcha.consume()
    // El modo del equipo se fija ANTES del login: en "compartido" no se
    // persiste nada (y se borra lo que hubiera) desde la primera respuesta.
    // En la app instalada es personal sin depender del piloto (D-12).
    const personal = !sharedDevice && canUsePersonalDevice(values.email)
    await setDeviceMode(personal ? "personal" : "compartido").catch(() => undefined)
    loginMutation.mutate({ ...values, captchaToken }, {
      onSuccess: async (data) => {
        const user = toAuthUserFromToken(data.token)
        // Revalidación con el token (correo + roles): fuera del piloto (y
        // fuera de la app instalada) el equipo vuelve a "compartido" y se
        // borra lo que se hubiera escrito.
        if (personal && !isPersonalDeviceAllowed(user)) {
          await setDeviceMode("compartido").catch(() => undefined)
          return
        }
        // App instalada: credencial local para poder volver a entrar SIN red
        // después de cerrar sesión (nunca la contraseña en claro).
        if (personal && user && isInstalledPersonalDevice()) {
          await saveLocalCredential(user.id, values.password).catch(() => undefined)
        }
      },
    })
  }

  let offlineCopy: string | null = null
  if (isOffline) {
    if (!offlineInfo) offlineCopy = "Necesitas conexión para iniciar sesión por primera vez en este equipo."
    else if (canUnlockWithPassword)
      offlineCopy = "Sin conexión: escribe tu correo y tu contraseña para volver a abrir tus datos guardados en este equipo."
    else if (needsPassword) offlineCopy = "Necesitas conexión para volver a entrar en este equipo."
    else offlineCopy = "Necesitas conexión para iniciar sesión."
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
        {!isOffline && <Turnstile {...captcha.widget} action="login" className="mt-4" />}
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {offlineCopy && (
          <p role="status" className="text-muted-foreground text-center text-sm">
            {offlineCopy}
          </p>
        )}
        {unlockError && (
          <p role="alert" className="text-red text-center text-sm">
            {unlockError}
          </p>
        )}
        <Button
          type="submit"
          color="primary"
          form={LOGIN_FORM_ID}
          disabled={
            loginMutation.isPending ||
            unlockOffline.isPending ||
            (isOffline ? !canUnlockWithPassword : !captcha.ready)
          }
          className="w-full"
        >
          {isOffline && canUnlockWithPassword ? "Entrar sin conexión" : "Ingresar"}
          {loginMutation.isPending || unlockOffline.isPending ? (
            <Spinner data-icon="inline-end" persistOffline />
          ) : (
            <ArrowRightIcon data-icon="inline-end" />
          )}
        </Button>
        {isOffline && offlineName && !needsPassword && (
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

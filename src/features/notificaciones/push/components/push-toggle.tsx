import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { BellIcon, BellSlashIcon, InfoIcon, WarningIcon } from "@/components/ui/icons"
import { env } from "@/config/env"
import {
  useSubscribePush,
  useUnsubscribePush,
} from "@/features/notificaciones/push/api/use-push-subscriptions"
import { PushDevicesList } from "@/features/notificaciones/push/components/push-devices-list"
import { isSubscribedBy } from "@/features/notificaciones/push/lib/push-client"
import {
  getPushAvailability,
  readPushEnvironment,
} from "@/features/notificaciones/push/lib/push-support"
import { getErrorMessage } from "@/lib/api-client"
import { useUser } from "@/lib/auth"
import { getDeviceMode } from "@/lib/offline/query-persister"

/**
 * "Activar notificaciones en este dispositivo" (D-4.5). Lo monta la pantalla
 * de preferencias de `features/notificaciones` en su slot.
 *
 * - Sin `VITE_APP_VAPID_PUBLIC_KEY` no renderiza nada.
 * - El permiso se pide SOLO en el `onClick` (nunca al cargar).
 * - iOS/iPadOS en pestaña: guía de instalación en lugar del botón.
 * - Permiso denegado: instrucciones; las notificaciones in-app siguen.
 * - Equipo compartido (`lib/offline`): exige marcar un opt-in explícito.
 */
export function PushToggle({ showDevices = true }: { showDevices?: boolean }) {
  const { data: user } = useUser()
  const [environment, setEnvironment] = useState(() => readPushEnvironment(env.VAPID_PUBLIC_KEY))
  const availability = getPushAvailability(environment)
  const userSub = user?.id ?? null
  const [subscribed, setSubscribed] = useState(() => isSubscribedBy(userSub))
  const [sharedOptIn, setSharedOptIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sharedDevice = getDeviceMode() === "compartido"

  const subscribe = useSubscribePush({
    mutationConfig: {
      onSuccess: () => {
        setError(null)
        setSubscribed(true)
      },
      onError: (e) => {
        // El permiso pudo pasar a `denied`: refrescar para mostrar la guía.
        setEnvironment(readPushEnvironment(env.VAPID_PUBLIC_KEY))
        setError(getErrorMessage(e))
      },
    },
  })
  const unsubscribe = useUnsubscribePush({
    mutationConfig: {
      onSuccess: () => {
        setError(null)
        setSubscribed(false)
      },
      onError: (e) => setError(getErrorMessage(e)),
    },
  })

  if (availability === "sin-clave" || !userSub) return null

  const pending = subscribe.isPending || unsubscribe.isPending

  return (
    <section className="flex flex-col gap-3" aria-labelledby="push-toggle-title">
      <div className="flex items-start gap-3">
        <BellIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="flex flex-col gap-1">
          <h3 id="push-toggle-title" className="text-sm font-medium">
            Notificaciones en este dispositivo
          </h3>
          <p className="text-sm text-muted-foreground">
            Recibí un aviso del sistema cuando tengas una notificación nueva, aunque la aplicación
            esté cerrada. El aviso no muestra el contenido: solo "Tienes una notificación nueva".
          </p>
        </div>
      </div>

      {availability === "ios-requiere-instalar" && (
        <Alert>
          <InfoIcon aria-hidden />
          <AlertTitle>Instalá la aplicación para recibir notificaciones</AlertTitle>
          <AlertDescription>
            <p>En iPhone y iPad las notificaciones solo funcionan con la aplicación instalada:</p>
            <ol className="list-decimal pl-5">
              <li>Abrí este sitio en Safari (iOS 16.4 o superior).</li>
              <li>Tocá el botón Compartir.</li>
              <li>Elegí "Agregar a pantalla de inicio".</li>
              <li>Abrí la aplicación desde el ícono y volvé a esta pantalla.</li>
            </ol>
          </AlertDescription>
        </Alert>
      )}

      {availability === "no-soportado" && (
        <Alert>
          <InfoIcon aria-hidden />
          <AlertDescription>
            Este navegador no admite notificaciones del sistema. Seguirás viendo tus
            notificaciones dentro de la aplicación.
          </AlertDescription>
        </Alert>
      )}

      {availability === "denegado" && (
        <Alert variant="destructive">
          <WarningIcon aria-hidden />
          <AlertTitle>Las notificaciones están bloqueadas</AlertTitle>
          <AlertDescription>
            <p>
              Para activarlas, abrí la configuración del sitio en tu navegador (el ícono a la
              izquierda de la dirección), cambiá "Notificaciones" a "Permitir" y recargá la página.
            </p>
            <p>Mientras tanto seguirás viendo tus notificaciones dentro de la aplicación.</p>
          </AlertDescription>
        </Alert>
      )}

      {availability === "disponible" && (
        <div className="flex flex-col gap-3">
          {sharedDevice && !subscribed && (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={sharedOptIn}
                onCheckedChange={(checked) => setSharedOptIn(checked === true)}
              />
              <span>
                Este equipo está marcado como compartido. Entiendo que los avisos aparecerán en
                este equipo hasta que cierre sesión.
              </span>
            </label>
          )}
          <div>
            {subscribed ? (
              <Button
                variant="outline"
                color="neutral"
                disabled={pending}
                onClick={() => unsubscribe.mutate(undefined)}
              >
                <BellSlashIcon data-icon="inline-start" />
                Desactivar en este dispositivo
              </Button>
            ) : (
              <Button
                disabled={pending || (sharedDevice && !sharedOptIn)}
                onClick={() =>
                  subscribe.mutate({ vapidPublicKey: env.VAPID_PUBLIC_KEY, userSub })
                }
              >
                <BellIcon data-icon="inline-start" />
                Activar en este dispositivo
              </Button>
            )}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red">
          {error}
        </p>
      )}

      {showDevices && <PushDevicesList />}
    </section>
  )
}

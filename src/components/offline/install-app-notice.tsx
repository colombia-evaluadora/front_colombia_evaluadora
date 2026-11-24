import { useSyncExternalStore } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CloudOffIcon } from "@/components/ui/icons"
import { canPromptInstall, isIos, promptInstall, subscribeInstall } from "@/lib/offline/storage-status"

/** Texto único del aviso de la web en pestaña (equipo compartido). */
export const INSTALL_APP_COPY = "Para usar la plataforma sin internet, instale la aplicación en su equipo personal."

/**
 * Aviso para la web en una pestaña del navegador (= equipo compartido,
 * `lib/offline/install-detection.ts`): ahí no se guarda nada para trabajar sin
 * conexión. Ofrece el botón de instalar si el navegador lo permite
 * (`beforeinstallprompt`); si no, instrucciones breves.
 */
export function InstallAppNotice() {
  const puedeInstalar = useSyncExternalStore(subscribeInstall, canPromptInstall, () => false)
  return (
    <Alert data-slot="install-app-notice">
      <CloudOffIcon />
      <AlertTitle>{INSTALL_APP_COPY}</AlertTitle>
      <AlertDescription className="flex min-w-0 flex-col gap-2">
        <span>
          En esta ventana del navegador no se guardan datos en el equipo y al cerrar sesión se borra lo
          local.
        </span>
        {puedeInstalar ? (
          <Button variant="fill" color="primary" size="sm" className="self-start" onClick={() => void promptInstall()}>
            Instalar la aplicación
          </Button>
        ) : (
          <span>
            {isIos()
              ? "En iPhone o iPad: toque Compartir y luego «Agregar a inicio». Después abra la plataforma desde ese ícono."
              : "En el menú del navegador (⋮), elija «Instalar aplicación». Después abra la plataforma desde ese ícono."}
          </span>
        )}
      </AlertDescription>
    </Alert>
  )
}

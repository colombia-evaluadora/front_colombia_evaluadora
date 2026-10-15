import { useEffect, useState } from "react"
import { useLocation } from "@tanstack/react-router"

import { CloudAlertIcon, CloudOffIcon } from "@/components/ui/icons"
import { BANNER_DELAY_MS, getOfflineBannerMessage } from "@/lib/offline/banner-message"
import { connectivityStore } from "@/lib/offline/connectivity"
import { useConnectivity } from "@/lib/offline/use-connectivity"
import { cn } from "@/lib/utils"

/**
 * Banner global de conexión, debajo del header de `/app`. Arranca el
 * heartbeat del `connectivityStore` mientras está montado. Hasta la Fase 2 no
 * muestra acciones de cola ("Ver pendientes").
 */
export function OfflineBanner() {
  const state = useConnectivity()
  const { pathname } = useLocation()
  const [visible, setVisible] = useState(false)
  const isOnline = state.status === "online"

  useEffect(() => {
    connectivityStore.start()
    return () => connectivityStore.stop()
  }, [])

  // Aparece tras 1,5 s sostenidos fuera de `online`; se oculta al instante.
  useEffect(() => {
    if (isOnline) {
      setVisible(false)
      return
    }
    const timeout = setTimeout(() => setVisible(true), BANNER_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [isOnline])

  const message = visible ? getOfflineBannerMessage(state, pathname) : null
  const isOffline = state.status === "offline"
  const Icon = isOffline ? CloudOffIcon : CloudAlertIcon

  // El contenedor con `role="status"` queda siempre montado (vacío en
  // `online`) para que los lectores de pantalla anuncien el cambio.
  return (
    <div role="status" aria-live="polite" data-slot="offline-banner">
      {message && (
        <div
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium",
            isOffline ? "bg-navy-22 text-navy" : "bg-yellow-22 text-yellow",
          )}
        >
          <Icon aria-hidden className="size-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}
    </div>
  )
}

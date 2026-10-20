import { useEffect, useRef, useState } from "react"
import { Link, useLocation } from "@tanstack/react-router"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { CloudAlertIcon, CloudCheckIcon, CloudOffIcon, CloudSyncIcon } from "@/components/ui/icons"
import {
  BANNER_DELAY_MS,
  getOfflineBannerMessage,
  getQueueBanner,
  SYNCED_MESSAGE,
  type QueueBanner,
} from "@/lib/offline/banner-message"
import { connectivityStore } from "@/lib/offline/connectivity"
import { useOfflineMissingData } from "@/lib/offline/missing-data"
import { OFFLINE_MISSING_DATA_BANNER } from "@/lib/offline/offline-messages"
import { isOnlineOnlyPath } from "@/lib/offline/online-only-paths"
import { useOutboxSummary } from "@/lib/offline/outbox/hooks"
import { outboxWindow } from "@/lib/offline/outbox/policy"
import { getOutboxUser } from "@/lib/offline/outbox/store"
import { getPersistedSession } from "@/lib/offline/session"
import { useConnectivity } from "@/lib/offline/use-connectivity"
import { cn } from "@/lib/utils"

const TONE: Record<QueueBanner["tone"], string> = {
  red: "bg-red-22 text-red",
  orange: "bg-orange-22 text-orange",
  blue: "bg-blue-22 text-blue",
  green: "bg-green-22 text-green",
  yellow: "bg-yellow-22 text-yellow",
}

/** Aviso de la ventana de 14 días (§0.2): fecha límite desde el día 12. */
function useWindowWarning(): { deadline: string | null; expired: boolean } {
  const [state, setState] = useState<{ deadline: string | null; expired: boolean }>({ deadline: null, expired: false })
  const sub = getOutboxUser()
  useEffect(() => {
    if (!sub) return
    let alive = true
    void getPersistedSession(sub)
      .then((session) => {
        if (!alive || !session) return
        const w = outboxWindow(session.lastOnlineAuthAt)
        setState({
          deadline: w.warn ? format(w.deadline, "d 'de' MMMM", { locale: es }) : null,
          expired: !w.accepting,
        })
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [sub])
  return state
}

/**
 * Banner global debajo del header de `/app` (plan §7.1): conectividad +
 * estados de la cola de cambios sin conexión. Prioridad: requiere login >
 * errores > conflictos > sin conexión > degradado > sincronizando >
 * aviso de ventana. Arranca el heartbeat mientras está montado.
 */
export function OfflineBanner() {
  const state = useConnectivity()
  const summary = useOutboxSummary()
  const windowWarning = useWindowWarning()
  const { pathname } = useLocation()
  const [visible, setVisible] = useState(false)
  const [synced, setSynced] = useState(false)
  const wasSyncing = useRef(false)
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

  // "Todos tus cambios están sincronizados." 5 s al terminar un lote limpio.
  useEffect(() => {
    if (summary.syncing) {
      wasSyncing.current = true
      return
    }
    if (!wasSyncing.current) return
    wasSyncing.current = false
    if (summary.total > 0) return
    setSynced(true)
    const t = setTimeout(() => setSynced(false), 5_000)
    return () => clearTimeout(t)
  }, [summary.syncing, summary.total])

  const queue = getQueueBanner({
    ...summary,
    windowWarnDeadline: windowWarning.deadline,
    windowExpired: windowWarning.expired,
  })
  const connectivityMessage = visible ? getOfflineBannerMessage(state, pathname) : null
  const isOffline = state.status === "offline"
  // Red de seguridad de las cargas infinitas: sin red, si la pantalla usa una
  // query que no tiene datos guardados, se dice acá aunque la vista no pinte
  // su propio aviso. En una vista solo en línea ya lo dice el empty state.
  const missingData = useOfflineMissingData()
  const missingLine = visible && isOffline && missingData && !isOnlineOnlyPath(pathname)
  const pendientesAction =
    summary.total > 0 ? { label: `Ver pendientes (${summary.total})`, href: "/app/pendientes" } : undefined

  let banner: (QueueBanner & { icon: typeof CloudOffIcon }) | null = null
  if (queue.high) banner = { ...queue.high, icon: CloudAlertIcon }
  else if (connectivityMessage) {
    banner = {
      tone: isOffline ? "blue" : "yellow",
      text: connectivityMessage,
      action: pendientesAction,
      icon: isOffline ? CloudOffIcon : CloudAlertIcon,
    }
  } else if (queue.low) banner = { ...queue.low, icon: queue.low.tone === "blue" ? CloudSyncIcon : CloudAlertIcon }
  else if (synced) banner = { tone: "green", text: SYNCED_MESSAGE, icon: CloudCheckIcon }

  const Icon = banner?.icon
  // El contenedor con `role="status"` queda siempre montado (vacío en
  // `online`) para que los lectores de pantalla anuncien el cambio.
  return (
    <div role="status" aria-live="polite" data-slot="offline-banner">
      {banner && Icon && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 px-4 py-2 text-sm font-medium",
            // Sin conexión conserva el navy de la Fase 0/1.
            banner.text === connectivityMessage && isOffline ? "bg-navy-22 text-navy" : TONE[banner.tone],
          )}
        >
          <Icon aria-hidden className="size-4 shrink-0" />
          <span>{banner.text}</span>
          {banner.action && (
            <Link to={banner.action.href} className="ml-auto underline underline-offset-2">
              {banner.action.label}
            </Link>
          )}
        </div>
      )}
      {missingLine && (
        <p data-slot="offline-missing-data" className="bg-navy-22 px-4 pb-2 text-sm text-navy">
          {OFFLINE_MISSING_DATA_BANNER}
        </p>
      )}
    </div>
  )
}

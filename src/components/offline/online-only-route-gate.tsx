import { useState, type ReactNode } from "react"
import { useLocation, useRouter } from "@tanstack/react-router"

import { OfflineEmptyState } from "@/components/offline/offline-empty-state"
import { isOnlineOnlyPath } from "@/lib/offline/online-only-paths"
import { useConnectivity } from "@/lib/offline/use-connectivity"

/**
 * Muestra el empty state "Esta sección necesita conexión" en lugar de una
 * vista solo en línea cuando se **entra** a ella sin conexión (tarea 4.1). Si
 * la red se cae con la vista ya abierta no la reemplaza: los datos en memoria
 * siguen visibles y las acciones se deshabilitan con `useOnlineOnly`.
 */
export function OnlineOnlyRouteGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { status } = useConnectivity()
  const router = useRouter()
  const offline = status === "offline"
  // Ruta en la que se entró estando offline (estado derivado al cambiar de
  // ruta, sin efecto: patrón "ajustar estado durante el render").
  const [enteredOffline, setEnteredOffline] = useState<string | null>(() => (offline ? pathname : null))
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setEnteredOffline(offline ? pathname : null)
  }
  if (!offline && enteredOffline !== null) setEnteredOffline(null)

  if (offline && enteredOffline === pathname && isOnlineOnlyPath(pathname)) {
    return <OfflineEmptyState onRetry={() => router.invalidate()} />
  }
  return children
}

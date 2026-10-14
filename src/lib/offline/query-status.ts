import type { FetchStatus } from "@tanstack/react-query"

import type { ConnectivityStatus } from "@/lib/offline/connectivity"

/**
 * `true` cuando una query no tiene datos (ni en memoria ni restaurados del
 * persister) y no puede pedirlos por falta de red (tarea 4.2). En `offline`
 * el `onlineManager` pausa las queries: quedan `pending` con `fetchStatus:
 * "paused"`, no en error, así que hay que mirar ambos.
 */
export function isOfflineWithoutData(
  query: { data: unknown; fetchStatus: FetchStatus; isError: boolean },
  status: ConnectivityStatus,
): boolean {
  if (query.data !== undefined) return false
  return query.fetchStatus === "paused" || (status === "offline" && query.isError)
}

import { useSyncExternalStore } from "react"

import { connectivityStore, type ConnectivityState } from "@/lib/offline/connectivity"

/** Estado de conectividad actual (`online` | `degraded` | `offline`). */
export function useConnectivity(): ConnectivityState {
  return useSyncExternalStore(connectivityStore.subscribe, connectivityStore.getState, connectivityStore.getState)
}

// TEMPORAL: stub mínimo para que compile el PR de sesión/HTTP (feat/offline-f0-sesion-http).
// Lo reemplaza la implementación real de feat/offline-f0-conectividad (heartbeat,
// histéresis, portal cautivo) cuando ese PR se mergee; la API es la misma.
export type ConnectivityStatus = "online" | "degraded" | "offline"
export interface ConnectivityState {
  status: ConnectivityStatus
  since: number
}

let state: ConnectivityState = { status: "online", since: Date.now() }
const listeners = new Set<(state: ConnectivityState) => void>()

function setStatus(status: ConnectivityStatus) {
  if (state.status === status) return
  state = { status, since: Date.now() }
  for (const fn of listeners) fn(state)
}

export const connectivityStore = {
  getState: (): ConnectivityState => state,
  subscribe(fn: (state: ConnectivityState) => void) {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },
  reportNetworkFailure(_reason?: string) {
    setStatus("degraded")
  },
  reportSuccess() {
    setStatus("online")
  },
  start() {},
  stop() {},
}

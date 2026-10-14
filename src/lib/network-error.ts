import Axios from "axios"

// Status que no son "el backend dijo que no" sino "no llegamos al backend":
// gateway caído/saturado (502/503/504) y los 52x propios de Cloudflare
// (520–524: el origen no respondió, timeout, conexión rechazada…).
const NETWORK_STATUSES = new Set([502, 503, 504, 520, 521, 522, 523, 524])

/**
 * Verdadero cuando la request falló por la red y no por el negocio: sin
 * `response` (offline, DNS, CORS de un portal cautivo), timeout
 * (`ECONNABORTED`/`ETIMEDOUT`), `ERR_NETWORK` o un status de gateway.
 *
 * Vive en un módulo aparte (y se re-exporta desde `api-client`) para que
 * `react-query.ts` lo use sin cerrar el ciclo api-client → query-client →
 * react-query → api-client.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof NetworkSessionError) return true
  if (!Axios.isAxiosError(error)) return false
  if (Axios.isCancel(error)) return false
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT" || error.code === "ERR_NETWORK") {
    return true
  }
  if (!error.response) return true
  return NETWORK_STATUSES.has(error.response.status)
}

/**
 * El refresh de sesión no pudo confirmar ni negar la sesión porque no hubo
 * red. NO equivale a "sin sesión": el guard de `/app` lo reintenta y, si
 * persiste, lo muestra en `ErrorPage` en vez de mandar a `/login`.
 */
export class NetworkSessionError extends Error {
  constructor(cause?: unknown) {
    super("No pudimos comunicarnos con el servidor", { cause })
    this.name = "NetworkSessionError"
  }
}

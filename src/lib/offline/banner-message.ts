import type { ConnectivityState } from "@/lib/offline/connectivity"

/** El banner espera esto antes de aparecer (histéresis: no parpadea). */
export const BANNER_DELAY_MS = 1_500

/**
 * Vistas que siguen funcionando sin conexión (`docs/offline/PLAN-offline.md`
 * §2): Planeador (incluye Planilla), Asistencia y Pendientes. El resto es
 * "solo en línea" y el banner lo dice.
 */
const OFFLINE_CAPABLE_PREFIXES = ["/app/planeador", "/app/asistencia", "/app/pendientes"]

export function isOfflineCapablePath(pathname: string): boolean {
  return OFFLINE_CAPABLE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export const OFFLINE_MESSAGE =
  "Estás sin conexión. Puedes seguir consultando y registrando asistencia y calificaciones; se enviarán cuando vuelva la conexión."
export const OFFLINE_ONLINE_ONLY_MESSAGE =
  "Estás sin conexión. Esta sección necesita conexión; tus datos guardados siguen disponibles en Planeador y Asistencia."
export const DEGRADED_MESSAGE = "La conexión está lenta o inestable. Lo que guardes se enviará apenas se estabilice."
export const SERVER_DOWN_MESSAGE = "No pudimos comunicarnos con el servidor"
export const CAPTIVE_PORTAL_HINT = "Puede que la red Wi-Fi requiera iniciar sesión."

/** Texto del banner según el estado; `null` = oculto. Función pura. */
export function getOfflineBannerMessage(state: ConnectivityState, pathname: string): string | null {
  if (state.status === "online") return null
  if (state.status === "offline") {
    return isOfflineCapablePath(pathname) ? OFFLINE_MESSAGE : OFFLINE_ONLINE_ONLY_MESSAGE
  }
  // 502/503 del gateway: el problema es nuestro, no de la red del usuario.
  if (state.reason === "server") return SERVER_DOWN_MESSAGE
  if (state.reason === "captive-portal") return `${DEGRADED_MESSAGE} ${CAPTIVE_PORTAL_HINT}`
  return DEGRADED_MESSAGE
}

import { OFFLINE_MAX_DAYS } from "@/lib/offline/limits"
import type { ConnectivityState } from "@/lib/offline/connectivity"
import { isOnlineOnlyPath } from "@/lib/offline/online-only-paths"

/** El banner espera esto antes de aparecer (histéresis: no parpadea). */
export const BANNER_DELAY_MS = 1_500

/**
 * Una vista de `/app` funciona sin conexión salvo que esté en la lista de solo
 * en línea (`online-only-paths.ts`). Antes había una segunda lista "positiva"
 * que se desincronizó: Informes, Periodos, Comunicaciones o `/app` mostraban
 * "Esta sección necesita conexión" aunque sus datos estaban guardados.
 * Auditoría completa: `docs/offline/AUDITORIA-RUTAS.md`.
 */
export function isOfflineCapablePath(pathname: string): boolean {
  return pathname.startsWith("/app") && !isOnlineOnlyPath(pathname)
}

export const OFFLINE_MESSAGE =
  "Estás sin conexión. Puedes seguir consultando y registrando asistencia y calificaciones; se enviarán cuando vuelva la conexión."
export const OFFLINE_ONLINE_ONLY_MESSAGE =
  "Estás sin conexión. Esta sección necesita conexión; tus datos guardados siguen disponibles en Planeador, Planilla, Asistencia, Informes y Referentes."
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

// ---- Estados de la cola (Fase 2, plan §7.1) ----------------------------------

export type QueueBannerTone = "red" | "orange" | "blue" | "green" | "yellow"

export interface QueueBanner {
  tone: QueueBannerTone
  text: string
  action?: { label: string; href: string }
}

export interface QueueBannerInput {
  needsLogin: boolean
  total: number
  rejected: number
  blocked: number
  conflict: number
  syncing: boolean
  batchDone: number
  batchTotal: number
  /** Fecha límite de la ventana de 14 días si ya se pasó el día 12. */
  windowWarnDeadline?: string | null
  windowExpired?: boolean
}

/**
 * Mensajes de la cola que tienen prioridad sobre el de conectividad (requiere
 * login > errores > conflictos) y los que van detrás (sincronizando, aviso de
 * ventana). Función pura; `null` = nada que mostrar por la cola.
 */
export function getQueueBanner(q: QueueBannerInput): { high: QueueBanner | null; low: QueueBanner | null } {
  let high: QueueBanner | null = null
  if (q.needsLogin && q.total > 0) {
    high = {
      tone: "red",
      text: `Tu sesión expiró. Inicia sesión para enviar ${q.total} cambios pendientes. No se perderán.`,
      action: { label: "Iniciar sesión", href: "/login?redirectTo=/app/pendientes" },
    }
  } else if (q.rejected + q.blocked > 0) {
    high = {
      tone: "red",
      text: `${q.rejected + q.blocked} cambios no se pudieron guardar. Revísalos para no perder información.`,
      action: { label: "Revisar", href: "/app/pendientes?estado=error" },
    }
  } else if (q.conflict > 0) {
    high = {
      tone: "orange",
      text: `${q.conflict} cambios chocan con modificaciones hechas por otra persona. Elige qué versión conservar.`,
      action: { label: "Resolver", href: "/app/pendientes?estado=conflictos" },
    }
  }
  let low: QueueBanner | null = null
  if (q.syncing && q.batchTotal > 0) {
    low = { tone: "blue", text: `Sincronizando cambios… (${Math.min(q.batchDone, q.batchTotal)} de ${q.batchTotal})` }
  } else if (q.windowExpired) {
    low = {
      tone: "yellow",
      text: `Llevas ${OFFLINE_MAX_DAYS} días sin conectarte. Conéctate para seguir registrando sin conexión; lo que ya guardaste está a salvo.`,
    }
  } else if (q.windowWarnDeadline) {
    low = { tone: "yellow", text: `Conéctate antes del ${q.windowWarnDeadline} para seguir trabajando sin conexión.` }
  }
  return { high, low }
}

export const SYNCED_MESSAGE = "Todos tus cambios están sincronizados."

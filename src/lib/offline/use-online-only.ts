import type { ConnectivityStatus } from "@/lib/offline/connectivity"
import { useConnectivity } from "@/lib/offline/use-connectivity"

/** Tooltip estándar de botón solo en línea (plan offline §7.5 / §8 *[texto SO]*). */
export const ONLINE_ONLY_TOOLTIP = "Necesitas conexión para esta acción."

export interface OnlineOnlyState {
  /** `true` sin conexión: la acción no se puede ejecutar ni encolar. */
  disabled: boolean
  /** Motivo legible (igual al tooltip) o `null` si está habilitada. */
  reason: string | null
  /** Texto del tooltip a mostrar sobre el control deshabilitado (o `null`). */
  tooltip: string | null
}

/**
 * Lógica pura de `useOnlineOnly` (testeable sin DOM). Solo `offline`
 * deshabilita: en `degraded` el request todavía puede salir y, si falla, el
 * error se muestra como siempre.
 */
export function getOnlineOnlyState(status: ConnectivityStatus, tooltip: string = ONLINE_ONLY_TOOLTIP): OnlineOnlyState {
  if (status !== "offline") return { disabled: false, reason: null, tooltip: null }
  return { disabled: true, reason: tooltip, tooltip }
}

/**
 * Estado de una acción solo en línea (tarea 4.1). Uso:
 * `const so = useOnlineOnly()` → `<Button disabled={so.disabled || …}>` y
 * envolver con `<OnlineOnlyTooltip tooltip={so.tooltip}>`. Algunas vistas usan
 * un copy propio del plan §8 (p. ej. "Los cambios de roles y menús necesitan conexión.").
 */
export function useOnlineOnly(tooltip?: string): OnlineOnlyState {
  const { status } = useConnectivity()
  return getOnlineOnlyState(status, tooltip)
}

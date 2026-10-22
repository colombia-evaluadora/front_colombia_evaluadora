/**
 * Revocación y borrado remoto del equipo (`add-offline-meses-pwa`, D-8).
 *
 * Un equipo revocado desde "Mis dispositivos" (por su dueño o por un super
 * administrador) se entera en su siguiente contacto con el servidor:
 * - el canje del token del equipo responde 401 `device_revoked` con `wipe`, o
 * - `GET /auth/devices/me` (al entrar con red y al empezar cada
 *   sincronización) responde `REVOKED`.
 * Con `wipe` la app muestra un aviso bloqueante (cuántos cambios sin
 * sincronizar se perderían), intenta subir lo pendiente si hay sesión, borra
 * los datos del usuario en el equipo, confirma el borrado y vuelve al login.
 * Sin `wipe` solo se olvida el token del equipo: se vuelve a la contraseña.
 */
import type { DeviceRefreshResult, DeviceStatusResponse } from "@/lib/offline/device-token"

export type DeviceAction = "none" | "wipe" | "drop-token" | "reregister"

/** Qué hacer con la respuesta de `GET /auth/devices/me`. */
export function actionForStatus(status: DeviceStatusResponse | null | undefined): DeviceAction {
  if (!status) return "none"
  switch (status.status) {
    case "ACTIVE":
      return "none"
    case "REVOKED":
      return status.wipe ? "wipe" : "drop-token"
    case "EXPIRED":
    case "UNKNOWN":
      return "reregister"
    default:
      return "none"
  }
}

/** Qué hacer con el resultado de canjear el token del equipo. */
export function actionForRefresh(result: DeviceRefreshResult): DeviceAction {
  if (result.kind === "revoked") return result.wipe ? "wipe" : "drop-token"
  if (result.kind === "invalid") return "reregister"
  return "none"
}

export interface RevocationState {
  sub: string
  revokedAt: string | null
}

let state: RevocationState | null = null
const listeners = new Set<() => void>()

export const deviceRevocationStore = {
  get: (): RevocationState | null => state,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

/** Pide el borrado remoto: lo resuelve `DeviceRevokedDialog`. */
export function requestRemoteWipe(sub: string, revokedAt: string | null = null) {
  if (state?.sub === sub) return
  state = { sub, revokedAt }
  listeners.forEach((l) => l())
}

export function clearRemoteWipeRequest() {
  state = null
  listeners.forEach((l) => l())
}

export function isRemoteWipePending(): boolean {
  return state != null
}

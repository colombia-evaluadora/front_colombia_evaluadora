/** Equipo registrado de un usuario (`GET /auth/devices`, auth-center). */
export type RevokeReason = "USUARIO" | "ADMIN" | "REUSO" | "REEMPLAZO"

export interface Device {
  id: number
  deviceId: string
  label: string | null
  userAgent: string | null
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string | null
  revokedAt: string | null
  revokeReason: RevokeReason | null
  wipeRequested: boolean
  wipedAt: string | null
  /** Es el equipo desde el que se consulta (header `X-Device-Id`). */
  current: boolean
}

export type DeviceState = "activo" | "vencido" | "revocado" | "borrado-pendiente" | "borrado"

/** Estado visible: el borrado remoto pendiente se distingue del ya confirmado. */
export function deviceState(device: Device, now = Date.now()): DeviceState {
  if (device.revokedAt) {
    if (device.wipeRequested) return device.wipedAt ? "borrado" : "borrado-pendiente"
    return "revocado"
  }
  if (device.expiresAt && Date.parse(device.expiresAt) <= now) return "vencido"
  return "activo"
}

export const DEVICE_STATE_LABEL: Record<DeviceState, string> = {
  activo: "Activo",
  vencido: "Vencido",
  revocado: "Revocado",
  "borrado-pendiente": "Borrado pendiente",
  borrado: "Datos borrados",
}

export const REVOKE_REASON_LABEL: Record<RevokeReason, string> = {
  USUARIO: "por el usuario",
  ADMIN: "por un administrador",
  REUSO: "por seguridad (token reutilizado)",
  REEMPLAZO: "reemplazado por un registro nuevo",
}

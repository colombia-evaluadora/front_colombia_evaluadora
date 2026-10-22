/**
 * Orquestación de la credencial del equipo con la sesión (`device-token.ts`):
 * - `tryDeviceSession`: al restaurar la sesión, el token del equipo va
 *   PRIMERO (el access token con `did` es el único con el que el backend
 *   acepta `X-Client-Captured-At`); la cookie `sso_refresh` queda de respaldo.
 * - `reconcileDevice`: con sesión online confirma el estado del equipo en el
 *   servidor (revocado / borrado remoto / vencido) y lo registra si es un
 *   equipo personal sin credencial.
 * - `ensureDeviceAccessToken`: antes de cada sincronización de la outbox,
 *   cambia un access token sin `did` (login con contraseña) por uno del equipo.
 */
import { getAuthToken, setAuthToken } from "@/lib/api-client"
import { deleteMeta, getMeta, isIndexedDbAvailable, setMeta } from "@/lib/offline/db"
import { actionForRefresh, actionForStatus, requestRemoteWipe, type DeviceAction } from "@/lib/offline/device-revocation"
import {
  deleteDeviceToken,
  deviceRefresh,
  fetchDeviceStatus,
  getDeviceId,
  hasDeviceToken,
  readDeviceToken,
  registerDevice,
  tokenHasDeviceClaim,
} from "@/lib/offline/device-token"
import { isDeviceSessionLocked } from "@/lib/offline/local-credential"
import { getOfflineMode } from "@/lib/offline/offline-mode"
import { getDeviceMode, getLastUserSub } from "@/lib/offline/query-persister"

/** El dueño revocó el equipo sin borrar: no se vuelve a registrar solo. */
const optOutKey = (sub: string) => `device:optout:${sub}`

/** Credencial del equipo habilitada: modo offline completo y equipo personal. */
export function deviceCredentialEnabled(): boolean {
  return isIndexedDbAvailable() && getOfflineMode() === "full" && getDeviceMode() === "personal"
}

async function applyAction(sub: string, action: DeviceAction, revokedAt: string | null = null) {
  if (action === "wipe") {
    requestRemoteWipe(sub, revokedAt)
  } else if (action === "drop-token") {
    await deleteDeviceToken(sub)
    await setMeta(optOutKey(sub), true).catch(() => undefined)
  } else if (action === "reregister") {
    await deleteDeviceToken(sub)
  }
}

/**
 * Access token a partir del token del equipo del último usuario, o `null`
 * (sin credencial, PIN cerrado, app bloqueada tras "Cerrar sesión", revocado,
 * inválido). Un error de red se propaga: no dice nada de la sesión.
 */
export async function tryDeviceSession(): Promise<string | null> {
  if (!deviceCredentialEnabled()) return null
  const sub = await getLastUserSub().catch(() => undefined)
  if (!sub) return null
  // "Cerrar sesión" en la app instalada bloquea (D-12): el token del equipo
  // no puede reabrirla sin la contraseña o el PIN.
  if (await isDeviceSessionLocked(sub).catch(() => false)) return null
  const result = await deviceRefresh(sub)
  if (result.kind === "ok") return result.accessToken
  await applyAction(sub, actionForRefresh(result))
  return null
}

/**
 * Con sesión online (contraseña, cookie o equipo): estado del equipo y alta.
 * Nunca tira; lo llama `onOnlineAuthenticated` una vez por usuario y carga.
 */
export async function reconcileDevice(sub: string): Promise<void> {
  if (!deviceCredentialEnabled()) return
  try {
    const deviceId = await getDeviceId(sub)
    if (deviceId && (await hasDeviceToken(sub))) {
      const status = await fetchDeviceStatus(deviceId)
      const action = actionForStatus(status)
      if (action === "reregister") {
        await deleteDeviceToken(sub)
        await registerDevice(sub)
        return
      }
      await applyAction(sub, action, status.revokedAt)
      return
    }
    if (await getMeta<boolean>(optOutKey(sub)).catch(() => false)) return
    await registerDevice(sub)
  } catch (error) {
    console.warn("[offline] no se pudo registrar o verificar el equipo", error)
  }
}

/** "Registrar este equipo" desde Mis dispositivos: quita la marca de revocado. */
export async function registerThisDevice(sub: string): Promise<void> {
  await deleteMeta(optOutKey(sub)).catch(() => undefined)
  await deleteDeviceToken(sub)
  await registerDevice(sub)
}

/** "Olvidar este equipo": borra el token local y no lo vuelve a registrar solo. */
export async function forgetThisDevice(sub: string): Promise<void> {
  await deleteDeviceToken(sub)
  await setMeta(optOutKey(sub), true).catch(() => undefined)
}

/**
 * Antes de un lote de la outbox: si hay token del equipo y el access token
 * actual no trae `did`, se canjea (así `X-Client-Captured-At` vale). Devuelve
 * `true` si dejó un access token del equipo. Un revocado con borrado pide el
 * borrado remoto. Los errores de red no cambian nada (la outbox decide).
 */
let lastStatusCheck = 0
const STATUS_CHECK_INTERVAL_MS = 60_000

/**
 * Con un access token del equipo vigente no hace falta canjear, pero la
 * revocación igual se mira al empezar la sincronización (a lo sumo una vez por
 * minuto). Lo pendiente se sigue subiendo: el aviso de borrado lo resuelve.
 */
async function checkStatusBeforeSync(sub: string) {
  if (Date.now() - lastStatusCheck < STATUS_CHECK_INTERVAL_MS) return
  lastStatusCheck = Date.now()
  const deviceId = await getDeviceId(sub)
  if (!deviceId) return
  const status = await fetchDeviceStatus(deviceId).catch(() => null)
  const action = actionForStatus(status)
  if (action !== "none" && action !== "reregister") await applyAction(sub, action, status?.revokedAt ?? null)
}

export async function ensureDeviceAccessToken(sub: string | null, force = false): Promise<boolean> {
  if (!sub || !deviceCredentialEnabled()) return false
  if (!force && tokenHasDeviceClaim(getAuthToken())) {
    await checkStatusBeforeSync(sub)
    return true
  }
  if (!(await readDeviceToken(sub))) return false
  const result = await deviceRefresh(sub)
  if (result.kind === "ok") {
    setAuthToken(result.accessToken)
    return true
  }
  await applyAction(sub, actionForRefresh(result))
  return false
}

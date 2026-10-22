/**
 * Credencial del equipo (`add-offline-meses-pwa`, D-3 / D-8; sso
 * `academico_test.tdevice_token`).
 *
 * Un equipo personal registrado con red (`POST /auth/devices`) recibe un
 * token de equipo de 180 días que se canjea por un access token corto en
 * `POST /auth/device/refresh`, sin cookie ni contraseña: la app instalada
 * sincroniza después de meses sin volver a iniciar sesión. Cada canje ROTA el
 * token (el servidor devuelve uno nuevo y el anterior deja de servir), y el
 * access token que sale de ahí trae el claim `did`: es el único con el que el
 * backend acepta `X-Client-Captured-At` (periodo abierto al capturar).
 *
 * Almacenamiento (nunca en `localStorage` ni `sessionStorage`):
 * - con PIN y la bóveda abierta, sellado con la DEK de la bóveda (`enc1:`);
 * - sin PIN, cifrado con una clave AES-GCM NO extraíble generada para el
 *   usuario y guardada en IndexedDB como `CryptoKey` (structured clone). No
 *   protege de quien ya controla el navegador, pero el token nunca queda en
 *   claro en disco ni se puede exportar la clave con JavaScript.
 * Al crear el PIN se re-sella con la bóveda (`resealDeviceToken`).
 *
 * El `deviceId` es un UUID aleatorio por (equipo, usuario) y viaja en cada
 * canje: el token está atado a ese id en el servidor.
 */
import Axios from "axios"

import { api, isNetworkError } from "@/lib/api-client"
import { deleteMeta, getMeta, isIndexedDbAvailable, setMeta } from "@/lib/offline/db"
import { hasVault, isEncrypted, openString, sealString, vaultStore } from "@/lib/offline/vault"

const deviceIdKey = (sub: string) => `device:id:${sub}`
const tokenKey = (sub: string) => `device:token:${sub}`
const keyKey = (sub: string) => `device:key:${sub}`

interface StoredDeviceToken {
  v: 1
  deviceId: string
  /** `pin`: sellado con la DEK de la bóveda; `key`: con la clave local no extraíble. */
  mode: "pin" | "key"
  /** `pin` → `enc1:...`; `key` → `<iv b64>:<ct b64>`. */
  sealed: string
  expiresAt: string | null
}

function b64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ""
  for (const b of arr) s += String.fromCharCode(b)
  return btoa(s)
}

function unb64(text: string): Uint8Array<ArrayBuffer> {
  const s = atob(text)
  const out = new Uint8Array(new ArrayBuffer(s.length))
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

async function getLocalKey(sub: string): Promise<CryptoKey> {
  const existing = await getMeta<CryptoKey>(keyKey(sub))
  if (existing) return existing
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"])
  await setMeta(keyKey(sub), key)
  return key
}

async function sealWithLocalKey(sub: string, plain: string): Promise<string> {
  const key = await getLocalKey(sub)
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)))
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain))
  return `${b64(iv)}:${b64(ct)}`
}

async function openWithLocalKey(sub: string, sealed: string): Promise<string> {
  const key = await getMeta<CryptoKey>(keyKey(sub))
  if (!key) throw new Error("Sin clave del equipo")
  const [iv, ct] = sealed.split(":")
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, key, unb64(ct))
  return new TextDecoder().decode(plain)
}

/** UUID estable de este equipo para el usuario (se crea la primera vez). */
export async function getOrCreateDeviceId(sub: string): Promise<string> {
  const existing = await getMeta<string>(deviceIdKey(sub))
  if (existing) return existing
  const id = crypto.randomUUID()
  await setMeta(deviceIdKey(sub), id)
  return id
}

export async function getDeviceId(sub: string): Promise<string | undefined> {
  if (!isIndexedDbAvailable()) return undefined
  return getMeta<string>(deviceIdKey(sub))
}

/**
 * Guarda (o reemplaza) el token. Con PIN y la bóveda abierta queda sellado con
 * la DEK; si hay PIN pero la bóveda está cerrada se usa la clave local hasta
 * que se vuelva a abrir y se re-selle.
 */
export async function saveDeviceToken(
  sub: string,
  deviceId: string,
  token: string,
  expiresAt: string | null,
): Promise<void> {
  const pin = vaultStore.get() === "abierta" && (await hasVault(sub))
  const sealed = pin ? await sealString(token) : await sealWithLocalKey(sub, token)
  const record: StoredDeviceToken = { v: 1, deviceId, mode: pin ? "pin" : "key", sealed, expiresAt }
  await setMeta(tokenKey(sub), record)
}

export interface DeviceCredential {
  deviceId: string
  token: string
  expiresAt: string | null
}

/** Token en claro (solo memoria). `null` si no hay o no se puede abrir (PIN sin desbloquear). */
export async function readDeviceToken(sub: string): Promise<DeviceCredential | null> {
  if (!isIndexedDbAvailable()) return null
  const record = await getMeta<StoredDeviceToken>(tokenKey(sub)).catch(() => undefined)
  if (!record) return null
  try {
    const token =
      record.mode === "pin"
        ? isEncrypted(record.sealed) && vaultStore.get() === "abierta"
          ? await openString(record.sealed)
          : null
        : await openWithLocalKey(sub, record.sealed)
    if (!token) return null
    return { deviceId: record.deviceId, token, expiresAt: record.expiresAt }
  } catch {
    return null
  }
}

/** ¿Hay un token guardado (aunque esté sellado con un PIN todavía cerrado)? */
export async function hasDeviceToken(sub: string): Promise<boolean> {
  if (!isIndexedDbAvailable()) return false
  return (await getMeta<StoredDeviceToken>(tokenKey(sub)).catch(() => undefined)) != null
}

/** Al crear el PIN: el token pasa a sellarse con la DEK de la bóveda. */
export async function resealDeviceToken(sub: string): Promise<void> {
  const credential = await readDeviceToken(sub)
  if (!credential) return
  await saveDeviceToken(sub, credential.deviceId, credential.token, credential.expiresAt)
}

/** Borra el token y la clave local (el `deviceId` se conserva salvo `forgetId`). */
export async function deleteDeviceToken(sub: string, { forgetId = false } = {}): Promise<void> {
  if (!isIndexedDbAvailable()) return
  await deleteMeta(tokenKey(sub)).catch(() => undefined)
  await deleteMeta(keyKey(sub)).catch(() => undefined)
  if (forgetId) await deleteMeta(deviceIdKey(sub)).catch(() => undefined)
}

// ---- Servidor ---------------------------------------------------------------

interface RegisterResponse {
  id: number
  deviceId: string
  deviceToken: string
  expiresAt: string | null
  createdAt: string
}

/** Etiqueta legible del equipo para "Mis dispositivos" (navegador y sistema). */
export function defaultDeviceLabel(userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""): string {
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Chrome\//.test(userAgent)
      ? "Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Navegador"
  const os = /Android/.test(userAgent)
    ? "Android"
    : /iPhone|iPad/.test(userAgent)
      ? "iOS"
      : /Windows/.test(userAgent)
        ? "Windows"
        : /Mac OS X/.test(userAgent)
          ? "macOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "equipo"
  return `${browser} en ${os}`
}

/** Registra este equipo (requiere sesión con Bearer) y guarda el token. */
export async function registerDevice(sub: string, label = defaultDeviceLabel()): Promise<RegisterResponse> {
  const deviceId = await getOrCreateDeviceId(sub)
  const res = await api.post<RegisterResponse>("/auth/devices", { deviceId, label: label.slice(0, 80) })
  await saveDeviceToken(sub, res.deviceId ?? deviceId, res.deviceToken, res.expiresAt ?? null)
  return res
}

export type DeviceRefreshResult =
  | { kind: "ok"; accessToken: string }
  | { kind: "none" }
  | { kind: "revoked"; wipe: boolean }
  | { kind: "invalid"; reason: string }

interface DeviceRefreshResponse {
  accessToken: string
  deviceToken: string
  expiresAt: string | null
  expiresIn: number
}

// Un solo canje a la vez: dos canjes simultáneos con el mismo token rotarían
// dos veces y el segundo quedaría con un token que el servidor ya no reconoce.
let inflight: Promise<DeviceRefreshResult> | null = null

/**
 * Canjea el token del equipo por un access token. El token rotado se guarda
 * ANTES de devolver el access token: si el guardado falla, no se usa la
 * respuesta (el servidor tolera que se vuelva a presentar el anterior una vez).
 * Un error de red se propaga (no dice nada de la credencial).
 */
export function deviceRefresh(sub: string): Promise<DeviceRefreshResult> {
  if (!inflight) {
    inflight = doDeviceRefresh(sub).finally(() => {
      inflight = null
    })
  }
  return inflight
}

async function doDeviceRefresh(sub: string): Promise<DeviceRefreshResult> {
  const credential = await readDeviceToken(sub)
  if (!credential) return { kind: "none" }
  try {
    const res = await api.post<DeviceRefreshResponse>(
      "/auth/device/refresh",
      { deviceId: credential.deviceId, deviceToken: credential.token },
      { background: true },
    )
    await saveDeviceToken(sub, credential.deviceId, res.deviceToken, res.expiresAt ?? null)
    return { kind: "ok", accessToken: res.accessToken }
  } catch (error) {
    if (isNetworkError(error)) throw error
    if (Axios.isAxiosError(error) && error.response) {
      const data = (error.response.data ?? {}) as { error?: string; wipe?: boolean }
      if (error.response.status === 401 && data.error === "device_revoked") {
        return { kind: "revoked", wipe: data.wipe === true }
      }
      if (error.response.status === 429 || error.response.status >= 500) throw error
      // Token desconocido, vencido o cuenta deshabilitada: la credencial no
      // sirve más. Se borra; con contraseña se vuelve a registrar el equipo.
      await deleteDeviceToken(sub)
      return { kind: "invalid", reason: data.error ?? `http-${error.response.status}` }
    }
    throw error
  }
}

export type DeviceStatus = "ACTIVE" | "REVOKED" | "EXPIRED" | "UNKNOWN"

export interface DeviceStatusResponse {
  status: DeviceStatus
  wipe: boolean
  revokedAt: string | null
  revokeReason: string | null
  expiresAt: string | null
}

/** Estado de este equipo en el servidor (con sesión). */
export async function fetchDeviceStatus(deviceId: string): Promise<DeviceStatusResponse> {
  return api.get<DeviceStatusResponse>("/auth/devices/me", {
    headers: { "X-Device-Id": deviceId },
    background: true,
  })
}

/** Confirma el borrado remoto (mejor esfuerzo; necesita el token todavía guardado). */
export async function ackWipe(sub: string): Promise<void> {
  const credential = await readDeviceToken(sub)
  if (!credential) return
  await api
    .post("/auth/device/wipe-ack", { deviceId: credential.deviceId, deviceToken: credential.token }, { background: true })
    .catch(() => undefined)
}

/** ¿El access token lo emitió `/auth/device/refresh`? (claim `did`). */
export function tokenHasDeviceClaim(token: string | null): boolean {
  if (!token) return false
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    const claims = JSON.parse(atob(payload)) as { did?: unknown }
    return typeof claims.did === "string" && claims.did.length > 0
  } catch {
    return false
  }
}

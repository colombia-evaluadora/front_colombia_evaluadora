/**
 * Bóveda local (`openspec/changes/add-offline-meses-pwa` D-4 / D-8): PIN del
 * equipo y cifrado en reposo de lo que se guarda en IndexedDB.
 *
 * - Al crear el PIN se genera una DEK aleatoria (AES-GCM 256) que cifra los
 *   datos. La DEK se guarda ENVUELTA con una KEK derivada del PIN
 *   (PBKDF2-SHA256, 310 000 iteraciones, sal aleatoria de 16 bytes). Un PIN
 *   incorrecto falla la autenticación de AES-GCM al desenvolver: no hace falta
 *   guardar un hash aparte.
 * - La DEK desenvuelta vive SOLO en memoria (`CryptoKey` no extraíble). Al
 *   recargar la app hay que volver a escribir el PIN.
 * - Formato de un valor cifrado: `enc1:<iv b64>:<ct b64>`. Un valor sin el
 *   prefijo se lee tal cual (datos guardados antes de activar el PIN).
 * - 10 intentos fallidos seguidos borran los datos guardados (no los cambios
 *   pendientes, que siguen cifrados: con el PIN correcto se recuperan).
 */
import { deleteMeta, getMeta, isIndexedDbAvailable, setMeta } from "@/lib/offline/db"

export const PIN_MIN_LENGTH = 6
export const MAX_PIN_ATTEMPTS = 10
const ITERATIONS = 310_000
const PREFIX = "enc1:"

interface VaultRecord {
  v: 1
  salt: string
  iterations: number
  iv: string
  wrapped: string
}

export type VaultState = "sin-pin" | "bloqueada" | "abierta"

let state: VaultState = "sin-pin"
let owner: string | null = null
let dek: CryptoKey | null = null
const listeners = new Set<() => void>()

function setState(next: VaultState) {
  state = next
  listeners.forEach((l) => l())
}

export const vaultStore = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

const vaultKey = (sub: string) => `vault:${sub}`
const failsKey = (sub: string) => `vaultFails:${sub}`

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

async function deriveKek(pin: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"])
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  )
}

export function isValidPin(pin: string): boolean {
  return /^\d+$/.test(pin) && pin.length >= PIN_MIN_LENGTH
}

/** Carga el estado de la bóveda del usuario (sin abrirla). */
export async function loadVault(sub: string | null): Promise<VaultState> {
  if (owner !== sub) dek = null
  owner = sub
  if (!sub || !isIndexedDbAvailable()) {
    setState("sin-pin")
    return state
  }
  const record = await getMeta<VaultRecord>(vaultKey(sub)).catch(() => undefined)
  setState(record ? (dek ? "abierta" : "bloqueada") : "sin-pin")
  return state
}

/** Crea el PIN y deja la bóveda abierta. */
export async function createVault(sub: string, pin: string): Promise<void> {
  if (!isValidPin(pin)) throw new Error(`El PIN debe tener al menos ${PIN_MIN_LENGTH} dígitos.`)
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)))
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)))
  const kek = await deriveKek(pin, salt, ITERATIONS)
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])
  const wrapped = await crypto.subtle.wrapKey("raw", key, kek, { name: "AES-GCM", iv })
  const record: VaultRecord = { v: 1, salt: b64(salt), iterations: ITERATIONS, iv: b64(iv), wrapped: b64(wrapped) }
  await setMeta(vaultKey(sub), record)
  await deleteMeta(failsKey(sub))
  // En memoria se conserva una copia NO extraíble.
  dek = await crypto.subtle.importKey("raw", await crypto.subtle.exportKey("raw", key), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ])
  owner = sub
  setState("abierta")
}

export type UnlockResult = { ok: true } | { ok: false; remaining: number; wiped: boolean }

/**
 * Abre la bóveda. `onWipe` borra los datos guardados al agotar los intentos
 * (se inyecta para no depender del persister desde acá).
 */
export async function unlockVault(sub: string, pin: string, onWipe: () => Promise<void>): Promise<UnlockResult> {
  const record = await getMeta<VaultRecord>(vaultKey(sub))
  if (!record) return { ok: true }
  try {
    const kek = await deriveKek(pin, unb64(record.salt), record.iterations)
    dek = await crypto.subtle.unwrapKey(
      "raw",
      unb64(record.wrapped),
      kek,
      { name: "AES-GCM", iv: unb64(record.iv) },
      "AES-GCM",
      false,
      ["encrypt", "decrypt"],
    )
    owner = sub
    await deleteMeta(failsKey(sub))
    setState("abierta")
    return { ok: true }
  } catch {
    const fails = ((await getMeta<number>(failsKey(sub))) ?? 0) + 1
    if (fails >= MAX_PIN_ATTEMPTS) {
      await onWipe()
      await setMeta(failsKey(sub), 0)
      return { ok: false, remaining: MAX_PIN_ATTEMPTS, wiped: true }
    }
    await setMeta(failsKey(sub), fails)
    return { ok: false, remaining: MAX_PIN_ATTEMPTS - fails, wiped: false }
  }
}

/** "Olvidé mi PIN": borra la bóveda (quien llama borra antes los datos cifrados). */
export async function destroyVault(sub: string): Promise<void> {
  await deleteMeta(vaultKey(sub))
  await deleteMeta(failsKey(sub))
  if (owner === sub) {
    dek = null
    setState("sin-pin")
  }
}

export function lockVault() {
  dek = null
  if (state === "abierta") setState("bloqueada")
}

/** Hay PIN pero la bóveda no está abierta: no se debe leer ni escribir nada. */
export function isVaultLocked(): boolean {
  return state === "bloqueada"
}

export function isEncrypted(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PREFIX)
}

/** Cifra si la bóveda está abierta; sin PIN devuelve el texto tal cual. */
export async function sealString(plain: string): Promise<string> {
  if (!dek) return plain
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)))
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, dek, new TextEncoder().encode(plain))
  return `${PREFIX}${b64(iv)}:${b64(ct)}`
}

/** Descifra un `enc1:`; un texto plano vuelve igual. Tira si está cifrado y no hay DEK. */
export async function openString(value: string): Promise<string> {
  if (!isEncrypted(value)) return value
  if (!dek) throw new Error("Bóveda bloqueada")
  const [iv, ct] = value.slice(PREFIX.length).split(":")
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, dek, unb64(ct))
  return new TextDecoder().decode(plain)
}

export function __resetVaultForTests() {
  state = "sin-pin"
  owner = null
  dek = null
}

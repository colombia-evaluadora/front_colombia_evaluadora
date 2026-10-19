/**
 * Bloqueo de la app instalada al cerrar sesión (`add-offline-meses-pwa`,
 * D-12). En la PWA "Cerrar sesión" NO borra lo guardado: deja el equipo
 * BLOQUEADO. Para volver a entrar sin red hace falta:
 *
 * - el PIN, si el docente creó uno (la bóveda cifra los datos: `vault.ts`), o
 * - la contraseña, verificada contra una credencial LOCAL: PBKDF2-SHA256
 *   (310 000 iteraciones, sal aleatoria de 16 bytes) de la contraseña con la
 *   que entró con red la última vez. Nunca se guarda la contraseña ni el token;
 *   el hash solo sirve para abrir lo que ya está en este equipo (en el servidor
 *   no autentica nada).
 *
 * Con red el desbloqueo es el login normal contra el servidor, que además
 * renueva la credencial local.
 */
import { deleteMeta, getMeta, isIndexedDbAvailable, setMeta } from "@/lib/offline/db"

const ITERATIONS = 310_000

interface LocalCredential {
  v: 1
  salt: string
  iterations: number
  hash: string
}

const norm = (sub: string) => sub.trim().toLowerCase()
const credentialKey = (sub: string) => `credential:${norm(sub)}`
const lockKey = (sub: string) => `locked:${norm(sub)}`

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

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<string> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ])
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, base, 256)
  return b64(bits)
}

/** Comparación en tiempo constante (no corta en la primera diferencia). */
function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Guarda (o renueva) la credencial local tras un login correcto CON red. */
export async function saveLocalCredential(sub: string, password: string): Promise<void> {
  if (!isIndexedDbAvailable() || !globalThis.crypto?.subtle) return
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)))
  const record: LocalCredential = { v: 1, salt: b64(salt), iterations: ITERATIONS, hash: await derive(password, salt, ITERATIONS) }
  await setMeta(credentialKey(sub), record)
}

export async function hasLocalCredential(sub: string): Promise<boolean> {
  if (!isIndexedDbAvailable()) return false
  return (await getMeta<LocalCredential>(credentialKey(sub)).catch(() => undefined)) != null
}

/** `true` si la contraseña coincide con la última usada con red en este equipo. */
export async function verifyLocalCredential(sub: string, password: string): Promise<boolean> {
  if (!isIndexedDbAvailable() || !globalThis.crypto?.subtle) return false
  const record = await getMeta<LocalCredential>(credentialKey(sub)).catch(() => undefined)
  if (!record) return false
  const hash = await derive(password, unb64(record.salt), record.iterations)
  return sameString(hash, record.hash)
}

export async function deleteLocalCredential(sub: string): Promise<void> {
  if (!isIndexedDbAvailable()) return
  await deleteMeta(credentialKey(sub))
  await deleteMeta(lockKey(sub))
}

/** Cerrar sesión en la app instalada: los datos quedan, la entrada sin red pide desbloquear. */
export async function lockDeviceSession(sub: string): Promise<void> {
  if (!isIndexedDbAvailable()) return
  await setMeta(lockKey(sub), Date.now())
}

export async function unlockDeviceSession(sub: string): Promise<void> {
  if (!isIndexedDbAvailable()) return
  await deleteMeta(lockKey(sub))
}

export async function isDeviceSessionLocked(sub: string): Promise<boolean> {
  if (!isIndexedDbAvailable()) return false
  return (await getMeta<number>(lockKey(sub)).catch(() => undefined)) != null
}

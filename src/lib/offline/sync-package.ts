/**
 * Paquete de sincronización por USB (`openspec/changes/add-offline-meses-pwa`
 * D-9). Para cuando el equipo del docente nunca tiene internet: exporta los
 * cambios pendientes (ops + adjuntos) a un archivo cifrado y firmado, que se
 * importa en OTRO equipo con internet donde el mismo usuario inició sesión.
 *
 * - Cifrado: AES-GCM 256 con clave PBKDF2-SHA256 (310 000 iteraciones) de una
 *   frase que elige el docente (la DEK del PIN no sirve: es del equipo).
 * - Firma: ECDSA P-256 con una clave del equipo (privada NO extraíble, en
 *   IndexedDB). Detecta un archivo alterado o truncado. Sin registro de
 *   equipos en el servidor (D-3, pendiente de aprobar el esquema) la firma
 *   prueba integridad, no identidad: la identidad la da la sesión del que
 *   importa (debe ser el mismo usuario) y el backend autoriza cada escritura.
 * - Importar dos veces no duplica: cada op conserva su `Idempotency-Key` y su
 *   instante de captura (`X-Client-Captured-At`).
 */
import { APP_VERSION } from "@/lib/app-version"
import { getMeta, isIndexedDbAvailable, setMeta, type BlobRowShape } from "@/lib/offline/db"
import { getBlobs, nextSeq, outboxStore, putOps } from "@/lib/offline/outbox/store"
import type { OutboxOp } from "@/lib/offline/outbox/types"

export const PACKAGE_FORMAT = "ce-sync"
export const PASSPHRASE_MIN_LENGTH = 8
const ITERATIONS = 310_000
const SIGNING_KEY_META = "deviceSigningKey"

interface PackageBlob extends Omit<BlobRowShape, "blob"> {
  data: string
}

interface PackagePlain {
  ops: OutboxOp[]
  blobs: PackageBlob[]
}

export interface SyncPackageFile {
  format: typeof PACKAGE_FORMAT
  v: 1
  sub: string
  exportedAt: string
  appVersion: string
  count: number
  salt: string
  iv: string
  ct: string
  publicKey: JsonWebKey
  signature: string
}

export class SyncPackageError extends Error {}

function b64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ""
  for (let i = 0; i < arr.length; i += 0x8000) s += String.fromCharCode(...arr.subarray(i, i + 0x8000))
  return btoa(s)
}

function unb64(text: string): Uint8Array<ArrayBuffer> {
  const s = atob(text)
  const out = new Uint8Array(new ArrayBuffer(s.length))
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

async function passKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ])
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
}

/** Lo firmado: todo lo que identifica y contiene el paquete. */
function signedBytes(p: Pick<SyncPackageFile, "sub" | "exportedAt" | "count" | "salt" | "iv" | "ct">) {
  return new TextEncoder().encode([PACKAGE_FORMAT, p.sub, p.exportedAt, p.count, p.salt, p.iv, p.ct].join("|"))
}

const ECDSA = { name: "ECDSA", namedCurve: "P-256" } as const
const SIGN = { name: "ECDSA", hash: "SHA-256" } as const

async function deviceSigningKey(): Promise<CryptoKeyPair> {
  if (isIndexedDbAvailable()) {
    const stored = await getMeta<CryptoKeyPair>(SIGNING_KEY_META).catch(() => undefined)
    if (stored?.privateKey && stored.publicKey) return stored
  }
  const pair = await crypto.subtle.generateKey(ECDSA, false, ["sign", "verify"])
  if (isIndexedDbAvailable()) await setMeta(SIGNING_KEY_META, pair).catch(() => undefined)
  return pair
}

/** Exporta los cambios pendientes del usuario. Funciona sin red. */
export async function exportSyncPackage(sub: string, passphrase: string): Promise<{ blob: Blob; count: number }> {
  if (passphrase.length < PASSPHRASE_MIN_LENGTH) {
    throw new SyncPackageError(`La frase debe tener al menos ${PASSPHRASE_MIN_LENGTH} caracteres.`)
  }
  const ops = outboxStore.getOps().filter((op) => op.status !== "done" && op.userSub === sub)
  if (ops.length === 0) throw new SyncPackageError("No hay cambios pendientes para exportar.")
  const blobs: PackageBlob[] = []
  for (const op of ops) {
    for (const row of await getBlobs(op.id)) {
      const { blob, ...rest } = row
      blobs.push({ ...rest, data: b64(await blob.arrayBuffer()) })
    }
  }
  const plain: PackagePlain = { ops, blobs }
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)))
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)))
  const key = await passKey(passphrase, salt)
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(plain)))
  const pair = await deviceSigningKey()
  const head = { sub, exportedAt: new Date().toISOString(), count: ops.length, salt: b64(salt), iv: b64(iv), ct: b64(ct) }
  const signature = await crypto.subtle.sign(SIGN, pair.privateKey, signedBytes(head))
  const file: SyncPackageFile = {
    format: PACKAGE_FORMAT,
    v: 1,
    appVersion: APP_VERSION,
    ...head,
    publicKey: await crypto.subtle.exportKey("jwk", pair.publicKey),
    signature: b64(signature),
  }
  return { blob: new Blob([JSON.stringify(file)], { type: "application/json" }), count: ops.length }
}

export interface ImportResult {
  agregados: number
  yaEstaban: number
}

/** Lee, verifica y descifra un paquete, y lo encola para el usuario en sesión. */
export async function importSyncPackage(text: string, passphrase: string, currentSub: string): Promise<ImportResult> {
  let file: SyncPackageFile
  try {
    file = JSON.parse(text) as SyncPackageFile
  } catch {
    throw new SyncPackageError("El archivo no es un paquete de sincronización.")
  }
  if (file.format !== PACKAGE_FORMAT || file.v !== 1) throw new SyncPackageError("Formato de paquete no reconocido.")
  if (file.sub.toLowerCase() !== currentSub.toLowerCase()) {
    throw new SyncPackageError("El paquete es de otro usuario: inicia sesión con la cuenta que lo exportó.")
  }
  const publicKey = await crypto.subtle.importKey("jwk", file.publicKey, ECDSA, false, ["verify"])
  const valid = await crypto.subtle.verify(SIGN, publicKey, unb64(file.signature), signedBytes(file))
  if (!valid) throw new SyncPackageError("La firma no coincide: el archivo fue modificado o está incompleto.")
  let plain: PackagePlain
  try {
    const key = await passKey(passphrase, unb64(file.salt))
    const bytes = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(file.iv) }, key, unb64(file.ct))
    plain = JSON.parse(new TextDecoder().decode(bytes)) as PackagePlain
  } catch {
    throw new SyncPackageError("Frase incorrecta.")
  }
  const existentes = new Set(outboxStore.getOps().map((op) => op.idempotencyKey))
  const nuevas = plain.ops.filter((op) => !existentes.has(op.idempotencyKey))
  const now = Date.now()
  const ops: OutboxOp[] = nuevas
    .sort((a, b) => a.seq - b.seq)
    .map((op) => ({
      ...op,
      userSub: currentSub,
      seq: nextSeq(),
      status: "pending",
      attempts: 0,
      nextAttemptAt: now,
      lastError: null,
      updatedAt: now,
    }))
  const ids = new Set(ops.map((op) => op.id))
  const blobs: BlobRowShape[] = plain.blobs
    .filter((b) => ids.has(b.opId))
    .map(({ data, ...rest }) => ({ ...rest, userSub: currentSub, blob: new Blob([unb64(data)], { type: rest.type }) }))
  await putOps(ops, blobs)
  return { agregados: ops.length, yaEstaban: plain.ops.length - ops.length }
}

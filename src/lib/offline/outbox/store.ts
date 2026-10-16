/**
 * Persistencia de la outbox en `ce-offline` (`outbox`, `blobs`, `log`) con
 * un espejo en memoria de las ops del usuario activo para que la UI las lea
 * sincrónicamente (`useSyncExternalStore`).
 *
 * Toda fila está particionada por `userSub`: nunca se leen ops de otro
 * usuario (§5.5). Otras pestañas se enteran de cambios por
 * `BroadcastChannel("ce-offline")` y recargan desde IndexedDB.
 */
import { getDb, isIndexedDbAvailable, type BlobRowShape, type LogRowShape } from "@/lib/offline/db"
import { DONE_RETENTION_MS, summarize } from "@/lib/offline/outbox/policy"
import type { OutboxOp, OutboxSummary } from "@/lib/offline/outbox/types"
import { EMPTY_SUMMARY } from "@/lib/offline/outbox/types"

export const LOG_LIMIT = 500
const CHANNEL = "ce-offline"

let currentUser: string | null = null
let ops: OutboxOp[] = []
let runtime: Partial<OutboxSummary> = {}
let summary: OutboxSummary = EMPTY_SUMMARY
const listeners = new Set<() => void>()
let channel: BroadcastChannel | null = null
let lastSeq = 0

type Message = { type: "changed"; userSub: string } | { type: "wake" } | { type: "logout" }
const messageListeners = new Set<(m: Message) => void>()

function getChannel(): BroadcastChannel | null {
  if (channel || typeof BroadcastChannel === "undefined") return channel
  channel = new BroadcastChannel(CHANNEL)
  channel.onmessage = (event: MessageEvent<Message>) => {
    const m = event.data
    if (m?.type === "changed" && m.userSub === currentUser) void reload()
    for (const l of messageListeners) l(m)
  }
  return channel
}

export function broadcast(message: Message) {
  try {
    getChannel()?.postMessage(message)
  } catch {
    // Canal cerrado: las otras pestañas se enteran al recargar.
  }
}

export function onBroadcast(listener: (m: Message) => void): () => void {
  getChannel()
  messageListeners.add(listener)
  return () => messageListeners.delete(listener)
}

function emit() {
  summary = summarize(ops, runtime)
  for (const l of listeners) l()
}

export const outboxStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getOps: () => ops,
  getSummary: () => summary,
}

export function getOutboxUser(): string | null {
  return currentUser
}

export function setRuntime(patch: Partial<OutboxSummary>) {
  runtime = { ...runtime, ...patch }
  emit()
}

const persistent = () => isIndexedDbAvailable()

/** Fija el dueño de la outbox en memoria y carga sus ops. */
export async function setOutboxUser(userSub: string | null): Promise<void> {
  if (currentUser === userSub) return
  currentUser = userSub
  ops = []
  runtime = {}
  getChannel()
  await reload()
}

export async function reload(): Promise<void> {
  const user = currentUser
  if (!user) {
    ops = []
    emit()
    return
  }
  if (!persistent()) {
    emit()
    return
  }
  try {
    const db = await getDb()
    const rows = (await db.getAllFromIndex("outbox", "byUser", user)) as unknown as OutboxOp[]
    if (currentUser !== user) return
    ops = rows.sort((a, b) => a.seq - b.seq)
    lastSeq = Math.max(lastSeq, ...ops.map((o) => o.seq), 0)
  } catch (error) {
    console.warn("[outbox] no se pudo leer la cola", error)
  }
  emit()
}

export function nextSeq(): number {
  lastSeq = Math.max(lastSeq + 1, Date.now())
  return lastSeq
}

/** Escribe (alta o cambio) ops. Lanza si IndexedDB no acepta (cuota): el llamador avisa. */
export async function putOps(changed: OutboxOp[], blobs: BlobRowShape[] = []): Promise<void> {
  if (changed.length === 0 && blobs.length === 0) return
  if (persistent()) {
    const db = await getDb()
    const tx = db.transaction(["outbox", "blobs"], "readwrite")
    await Promise.all([
      ...changed.map((op) => tx.objectStore("outbox").put(op as never)),
      ...blobs.map((b) => tx.objectStore("blobs").put(b)),
      tx.done,
    ])
  }
  const ids = new Set(changed.map((o) => o.id))
  ops = [...ops.filter((o) => !ids.has(o.id)), ...changed.filter((o) => o.userSub === currentUser)].sort(
    (a, b) => a.seq - b.seq,
  )
  emit()
  if (currentUser) broadcast({ type: "changed", userSub: currentUser })
}

export async function patchOp(id: string, patch: Partial<OutboxOp>): Promise<OutboxOp | undefined> {
  const op = ops.find((o) => o.id === id)
  if (!op) return undefined
  const next = { ...op, ...patch, updatedAt: Date.now() }
  await putOps([next])
  return next
}

export async function deleteOps(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  if (persistent()) {
    const db = await getDb()
    const tx = db.transaction(["outbox", "blobs"], "readwrite")
    const blobKeys = (
      await Promise.all(ids.map((id) => tx.objectStore("blobs").index("byOp").getAllKeys(id)))
    ).flat()
    await Promise.all([
      ...ids.map((id) => tx.objectStore("outbox").delete(id)),
      ...blobKeys.map((k) => tx.objectStore("blobs").delete(k)),
      tx.done,
    ])
  }
  const set = new Set(ids)
  ops = ops.filter((o) => !set.has(o.id))
  emit()
  if (currentUser) broadcast({ type: "changed", userSub: currentUser })
}

export async function getBlobs(opId: string): Promise<BlobRowShape[]> {
  if (!persistent()) return memoryBlobs.filter((b) => b.opId === opId)
  return (await getDb()).getAllFromIndex("blobs", "byOp", opId)
}

/** Sin IndexedDB (tests/compartido) los blobs viven en memoria. */
const memoryBlobs: BlobRowShape[] = []

export async function putBlob(blob: BlobRowShape): Promise<void> {
  if (!persistent()) {
    memoryBlobs.push(blob)
    return
  }
  await (await getDb()).put("blobs", blob)
}

export async function getUserBlobUsage(userSub: string): Promise<{ bytes: number; count: number }> {
  const rows = persistent()
    ? await (await getDb()).getAllFromIndex("blobs", "byUser", userSub)
    : memoryBlobs.filter((b) => b.userSub === userSub)
  const pending = rows.filter((b) => b.uploadedArchivoId == null)
  return { bytes: pending.reduce((acc, b) => acc + b.size, 0), count: pending.length }
}

/** Purga `done` de más de 24 h (§5.1). */
export async function purgeDone(now = Date.now()): Promise<void> {
  const old = ops.filter((o) => o.status === "done" && now - o.updatedAt > DONE_RETENTION_MS)
  await deleteOps(old.map((o) => o.id))
}

/** Borra TODA la outbox del usuario (descartar y salir / cambio a compartido). */
export async function clearOutbox(userSub: string): Promise<void> {
  if (persistent()) {
    const db = await getDb()
    const keys = await db.getAllKeysFromIndex("outbox", "byUser", userSub)
    const blobKeys = await db.getAllKeysFromIndex("blobs", "byUser", userSub)
    const logKeys = await db.getAllKeysFromIndex("log", "byUser", userSub)
    const tx = db.transaction(["outbox", "blobs", "log"], "readwrite")
    await Promise.all([
      ...keys.map((k) => tx.objectStore("outbox").delete(k)),
      ...blobKeys.map((k) => tx.objectStore("blobs").delete(k)),
      ...logKeys.map((k) => tx.objectStore("log").delete(k)),
      tx.done,
    ])
  }
  if (userSub === currentUser) {
    ops = []
    emit()
    broadcast({ type: "changed", userSub })
  }
}

/** Ops abiertas de un usuario sin cargarlo como activo (aviso de logout/cambio de usuario). */
export async function countOpenFor(userSub: string): Promise<number> {
  if (userSub === currentUser) return summary.total
  if (!persistent()) return 0
  const rows = (await (await getDb()).getAllFromIndex("outbox", "byUser", userSub)) as unknown as OutboxOp[]
  return rows.filter((o) => o.status !== "done").length
}

// ---- Log (ring buffer de 500, §4) ------------------------------------------

const memoryLog: LogRowShape[] = []

export async function logEvent(entry: Omit<LogRowShape, "at" | "userSub"> & { userSub?: string }) {
  const row: LogRowShape = { at: Date.now(), userSub: entry.userSub ?? currentUser ?? "", ...entry }
  if (!persistent()) {
    memoryLog.push(row)
    if (memoryLog.length > LOG_LIMIT) memoryLog.splice(0, memoryLog.length - LOG_LIMIT)
    return
  }
  try {
    const db = await getDb()
    await db.add("log", row)
    const keys = await db.getAllKeysFromIndex("log", "byUser", row.userSub)
    if (keys.length > LOG_LIMIT) {
      const tx = db.transaction("log", "readwrite")
      await Promise.all([...keys.slice(0, keys.length - LOG_LIMIT).map((k) => tx.store.delete(k)), tx.done])
    }
  } catch {
    // El log nunca debe romper la sincronización.
  }
}

export async function readLog(userSub: string): Promise<LogRowShape[]> {
  if (!persistent()) return memoryLog.filter((r) => r.userSub === userSub)
  return (await getDb()).getAllFromIndex("log", "byUser", userSub)
}

/** Solo tests. */
export function __resetOutboxStoreForTests() {
  currentUser = null
  ops = []
  runtime = {}
  summary = EMPTY_SUMMARY
  memoryBlobs.length = 0
  memoryLog.length = 0
  lastSeq = 0
}

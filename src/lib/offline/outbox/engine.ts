/**
 * Motor de la outbox: encolado (§5.3, §6.7), procesador con líder único entre
 * pestañas (§6.2, §6.10) y `runOrQueue`, el punto de entrada de las
 * mutaciones (decisión D-F2-7, online-first).
 */
import type { QueryClient } from "@tanstack/react-query"

import { isNetworkError } from "@/lib/network-error"
import { connectivityStore } from "@/lib/offline/connectivity"
import { getPersistedSession } from "@/lib/offline/session"
import { getOfflineMode } from "@/lib/offline/offline-mode"
import { getDeviceMode } from "@/lib/offline/query-persister"
import {
  backoffDelay,
  classifyError,
  CONCURRENCY,
  DEDUPE_MS,
  dependentsOf,
  isOpen,
  isStaleInflight,
  outboxWindow,
  selectBlocked,
  selectReady,
} from "@/lib/offline/outbox/policy"
import { getOutboxHandler } from "@/lib/offline/outbox/registry"
import {
  deleteOps,
  getBlobs,
  getOutboxUser,
  getUserBlobUsage,
  logEvent,
  nextSeq,
  onBroadcast,
  outboxStore,
  patchOp,
  purgeDone,
  putBlob,
  putOps,
  setRuntime,
} from "@/lib/offline/outbox/store"
import type { OutboxHandler, OutboxOp, SendCtx } from "@/lib/offline/outbox/types"

const MB = 1024 * 1024
export const FILE_LIMITS = {
  perFile: 10 * MB,
  perOp: 3,
  totalBytes: 150 * MB,
  totalFiles: 60,
} as const

export const QUEUED_MESSAGE = "Guardado en este equipo. Se enviará cuando haya conexión."
export const QUOTA_MESSAGE = "No hay espacio en este equipo para guardar el cambio sin conexión."
export const WINDOW_EXPIRED_MESSAGE =
  "Llevas 14 días sin conectarte. Conéctate para seguir registrando sin conexión; lo que ya guardaste está a salvo."
export const FILE_TOO_BIG_MESSAGE = "Este archivo pesa más de 10 MB: adjúntalo cuando tengas conexión."
export const FILE_QUOTA_MESSAGE =
  "Ya no hay espacio para más archivos sin conexión en este equipo. Sincroniza o adjunta este archivo cuando tengas conexión."

/** Error visible de encolado: el formulario NO se limpia y se muestra `message`. */
export class OutboxRejectedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "OutboxRejectedError"
  }
}

// ---- Habilitación ------------------------------------------------------------

/** Escritura offline: modo `full`, equipo personal (solo piloto) y usuario activo (D-F2-8). */
export function isOutboxEnabled(): boolean {
  return getOfflineMode() === "full" && getDeviceMode() === "personal" && getOutboxUser() != null
}

// ---- Dependencias inyectadas (sin ciclos con auth / query client) ------------

export type AuthCheck = "ok" | "unauth" | "network"
let ensureAuth: (force?: boolean) => Promise<AuthCheck> = async () => "ok"
let queryClientRef: QueryClient | null = null
type BatchReport = { done: number; failed: number; conflicts: number; notes: string[] }
let onBatchEnd: ((report: BatchReport) => void) | null = null
let onIdle: (() => void) | null = null

export function configureOutbox(options: {
  ensureAuth?: (force?: boolean) => Promise<AuthCheck>
  queryClient?: QueryClient
  onBatchEnd?: (report: BatchReport) => void
  onIdle?: () => void
}) {
  if (options.ensureAuth) ensureAuth = options.ensureAuth
  if (options.queryClient) queryClientRef = options.queryClient
  if (options.onBatchEnd) onBatchEnd = options.onBatchEnd
  if (options.onIdle) onIdle = options.onIdle
}

// ---- Encolado ----------------------------------------------------------------

export interface EnqueueOptions {
  idempotencyKey?: string
  dependsOn?: string[]
  /** Archivos referenciados en el payload por clave. */
  files?: Record<string, File>
}

async function checkWindow(userSub: string) {
  const session = await getPersistedSession(userSub).catch(() => undefined)
  if (!outboxWindow(session?.lastOnlineAuthAt).accepting) throw new OutboxRejectedError(WINDOW_EXPIRED_MESSAGE)
}

async function checkFiles(userSub: string, files: File[]) {
  if (files.length > FILE_LIMITS.perOp) throw new OutboxRejectedError(FILE_QUOTA_MESSAGE)
  if (files.some((f) => f.size > FILE_LIMITS.perFile)) throw new OutboxRejectedError(FILE_TOO_BIG_MESSAGE)
  if (files.length === 0) return
  const usage = await getUserBlobUsage(userSub)
  const bytes = files.reduce((acc, f) => acc + f.size, 0)
  if (usage.count + files.length > FILE_LIMITS.totalFiles || usage.bytes + bytes > FILE_LIMITS.totalBytes) {
    throw new OutboxRejectedError(FILE_QUOTA_MESSAGE)
  }
}

function isQuotaError(error: unknown) {
  return error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22)
}

export async function enqueue<P>(kind: string, payload: P, options: EnqueueOptions = {}): Promise<OutboxOp<P>> {
  const handler = getOutboxHandler<P>(kind)
  const userSub = getOutboxUser()
  if (!handler || !userSub || !isOutboxEnabled()) {
    throw new OutboxRejectedError("Este cambio necesita conexión.")
  }
  await checkWindow(userSub)
  const files = Object.entries(options.files ?? {})
  await checkFiles(
    userSub,
    files.map(([, f]) => f),
  )

  const entityKey = handler.entityKey(payload)
  const now = Date.now()
  const all = outboxStore.getOps()

  // Doble clic (< 2 s, mismo cuerpo): no se duplica.
  const serialized = JSON.stringify(payload)
  const dup = all.find(
    (o) => o.kind === kind && o.entityKey === entityKey && now - o.createdAt < DEDUPE_MS && JSON.stringify(o.payload) === serialized,
  )
  if (dup) return dup as OutboxOp<P>

  // Coalescing (§6.7): solo con una op que nunca se intentó enviar (una en
  // `retry` pudo haber llegado al servidor sin que viéramos la respuesta).
  const prev = [...all].reverse().find((o) => o.entityKey === entityKey && isOpen(o))
  if (prev && prev.kind === kind && prev.status === "pending" && prev.attempts === 0 && files.length === 0 && handler.coalesce) {
    const merged = handler.coalesce(prev.payload as P, payload)
    if (merged !== null) {
      try {
        const next = { ...(prev as OutboxOp<P>), payload: merged, idempotencyKey: crypto.randomUUID(), updatedAt: now }
        await putOps([next as OutboxOp])
        await logEvent({ level: "info", event: "coalesce", opId: prev.id })
        if (handler.applyOptimistic && queryClientRef) handler.applyOptimistic(queryClientRef, merged)
        scheduleSync(0)
        return next
      } catch (error) {
        if (isQuotaError(error)) throw new OutboxRejectedError(QUOTA_MESSAGE)
        throw error
      }
    }
  }

  const op: OutboxOp<P> = {
    id: crypto.randomUUID(),
    seq: nextSeq(),
    userSub,
    kind,
    handlerVersion: handler.version,
    entityKey,
    dependsOn: options.dependsOn ?? [],
    payload,
    blobRefs: [],
    idempotencyKey: options.idempotencyKey ?? crypto.randomUUID(),
    status: "pending",
    attempts: 0,
    nextAttemptAt: now,
    lastError: null,
    conflict: null,
    resultNote: null,
    createdAt: now,
    updatedAt: now,
    appBuild: String(import.meta.env.VITE_APP_BUILD ?? ""),
  }
  try {
    for (const [fileKey, file] of files) {
      const id = crypto.randomUUID()
      op.blobRefs.push(id)
      // Copia como Blob: si el usuario borra el archivo del disco, sigue disponible.
      const blob = new Blob([await file.arrayBuffer()], { type: file.type })
      await putBlob({ id, userSub, opId: op.id, fileKey, name: file.name, type: file.type, size: file.size, blob })
    }
    await putOps([op as OutboxOp])
  } catch (error) {
    if (isQuotaError(error)) throw new OutboxRejectedError(QUOTA_MESSAGE)
    throw error
  }
  await logEvent({ level: "info", event: "enqueue", opId: op.id, data: { kind } })
  if (handler.applyOptimistic && queryClientRef) handler.applyOptimistic(queryClientRef, payload)
  scheduleSync(0)
  return op
}

/** ¿Hay ops abiertas de esta entidad? (FIFO: lo nuevo va detrás). */
export function hasOpenFor(entityKey: string): boolean {
  return outboxStore.getOps().some((o) => o.entityKey === entityKey && isOpen(o))
}

// ---- runOrQueue (D-F2-7) -----------------------------------------------------

export type RunOrQueueResult<R> = { queued: false; result: R } | { queued: true; op: OutboxOp }

function directCtx(handler: OutboxHandler<never>, idempotencyKey: string, files: Record<string, File>): SendCtx {
  const cache = new Map<string, Promise<number>>()
  return {
    idempotencyKey,
    background: false,
    resolveFile(fileKey) {
      if (!cache.has(fileKey)) {
        const file = files[fileKey]
        if (!file || !handler.upload) return Promise.reject(new Error(`Archivo ${fileKey} no disponible`))
        cache.set(fileKey, handler.upload(file, false))
      }
      return cache.get(fileKey) as Promise<number>
    },
  }
}

/**
 * Envía directo si hay red; encola (con la MISMA `Idempotency-Key`) si no hay
 * red, si el envío falla por red o si la entidad ya tiene ops en cola. Sin
 * outbox habilitada (no piloto, equipo compartido, modo `read`) es un envío
 * directo, igual que antes de la Fase 2.
 */
export async function runOrQueue<P, R = unknown>(
  kind: string,
  payload: P,
  options: { files?: Record<string, File> } = {},
): Promise<RunOrQueueResult<R>> {
  const handler = getOutboxHandler<P>(kind)
  if (!handler) throw new Error(`Handler de outbox no registrado: ${kind}`)
  const idempotencyKey = crypto.randomUUID()
  const files = options.files ?? {}
  const send = async () =>
    (await handler.send(payload, directCtx(handler as unknown as OutboxHandler<never>, idempotencyKey, files))) as R

  if (!isOutboxEnabled()) return { queued: false, result: await send() }

  const offline = connectivityStore.getState().status === "offline"
  if (offline || hasOpenFor(handler.entityKey(payload))) {
    return { queued: true, op: await enqueue(kind, payload, { idempotencyKey, files }) }
  }
  try {
    return { queued: false, result: await send() }
  } catch (error) {
    if (!isNetworkError(error)) throw error
    return { queued: true, op: await enqueue(kind, payload, { idempotencyKey, files }) }
  }
}

// ---- Procesador --------------------------------------------------------------

let running = false
let timer: ReturnType<typeof setTimeout> | undefined
let paused = false

export function isSyncing(): boolean {
  return running || outboxStore.getOps().some((o) => o.status === "inflight")
}

export function scheduleSync(delayMs: number) {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => void syncNow(), Math.max(0, delayMs))
}

async function withLeaderLock(fn: () => Promise<void>): Promise<boolean> {
  const locks = typeof navigator !== "undefined" ? (navigator as Navigator & { locks?: LockManager }).locks : undefined
  if (!locks?.request) {
    await fn()
    return true
  }
  let acquired = false
  await locks.request("ce-outbox", { ifAvailable: true }, async (lock) => {
    if (!lock) return
    acquired = true
    await fn()
  })
  return acquired
}

async function processOp(op: OutboxOp, report: BatchReport, invalidate: Map<string, readonly unknown[]>) {
  const handler = getOutboxHandler(op.kind)
  if (!handler) return
  if (handler.version !== op.handlerVersion) {
    await patchOp(op.id, {
      status: "rejected",
      lastError: { code: "version", message: "Este cambio se guardó con una versión anterior de la app." },
    })
    report.failed++
    return
  }
  await patchOp(op.id, { status: "inflight" })
  const blobs = await getBlobs(op.id)
  const ctx: SendCtx = {
    idempotencyKey: op.idempotencyKey,
    background: true,
    async resolveFile(fileKey) {
      const row = blobs.find((b) => b.fileKey === fileKey)
      if (!row) throw new Error(`Archivo ${fileKey} no encontrado en la cola`)
      if (row.uploadedArchivoId != null) return row.uploadedArchivoId
      if (!handler.upload) throw new Error("El handler no sube archivos")
      const file = new File([row.blob], row.name, { type: row.type })
      row.uploadedArchivoId = await handler.upload(file, true)
      await putBlob(row)
      return row.uploadedArchivoId
    },
  }
  try {
    const result = await handler.send(op.payload as never, ctx)
    const note = handler.noteOf?.(result) ?? null
    if (note) report.notes.push(note)
    await patchOp(op.id, { status: "done", lastError: null, conflict: null, resultNote: note })
    for (const key of handler.invalidates(op.payload as never)) invalidate.set(JSON.stringify(key), key)
    report.done++
    await logEvent({ level: "info", event: "done", opId: op.id })
  } catch (error) {
    const classified = handler.classify?.(error) ?? classifyError(error, op.attempts)
    await logEvent({ level: "warn", event: `error:${classified.kind}`, opId: op.id, data: classified.error })
    if (classified.kind === "retry") {
      const attempts = op.attempts + 1
      await patchOp(op.id, {
        status: "retry",
        attempts,
        lastError: classified.error,
        nextAttemptAt: Date.now() + (classified.retryAfterMs ?? backoffDelay(attempts)),
      })
      return
    }
    if (classified.kind === "auth") {
      await patchOp(op.id, { status: "retry", lastError: classified.error, nextAttemptAt: Date.now() })
      throw new AuthPause()
    }
    if (classified.kind === "conflict") {
      await patchOp(op.id, { status: "conflict", lastError: classified.error, conflict: classified.conflict ?? null })
      report.conflicts++
      return
    }
    await patchOp(op.id, { status: "rejected", attempts: op.attempts + 1, lastError: classified.error })
    report.failed++
  }
}

class AuthPause extends Error {}

/** Un lote de sincronización (§6.2). Nunca tira. */
export async function syncNow(): Promise<void> {
  if (running || paused || !isOutboxEnabled()) return
  if (connectivityStore.getState().status === "offline") return
  const now = Date.now()
  const open = outboxStore.getOps().filter((o) => o.status !== "done")
  if (open.length === 0) return
  running = true
  try {
    await withLeaderLock(async () => {
      // Pestaña cerrada a mitad: `inflight` viejas vuelven a `retry`.
      for (const op of outboxStore.getOps().filter((o) => isStaleInflight(o, now))) {
        await patchOp(op.id, { status: "retry", nextAttemptAt: now })
      }
      if (selectReady(outboxStore.getOps(), now).length === 0) return

      const auth = await ensureAuth().catch(() => "network" as const)
      if (auth === "unauth") {
        setRuntime({ needsLogin: true })
        return
      }
      if (auth === "network") return
      setRuntime({ needsLogin: false })

      const report: BatchReport = { done: 0, failed: 0, conflicts: 0, notes: [] }
      const invalidate = new Map<string, readonly unknown[]>()
      const batchTotal = selectReady(outboxStore.getOps(), Date.now()).length
      setRuntime({ syncing: true, batchDone: 0, batchTotal })
      let authRetried = false
      for (;;) {
        for (const op of selectBlocked(outboxStore.getOps())) {
          await patchOp(op.id, {
            status: "blocked",
            lastError: { code: "blocked", message: "Depende de otro cambio que no se pudo guardar." },
          })
        }
        const ready = selectReady(outboxStore.getOps(), Date.now()).slice(0, CONCURRENCY)
        if (ready.length === 0) break
        if (connectivityStore.getState().status === "offline") break
        try {
          await Promise.all(ready.map((op) => processOp(op, report, invalidate)))
        } catch (error) {
          if (!(error instanceof AuthPause)) throw error
          if (authRetried) {
            setRuntime({ needsLogin: true })
            break
          }
          authRetried = true
          const again = await ensureAuth(true).catch(() => "network" as const)
          if (again !== "ok") {
            if (again === "unauth") setRuntime({ needsLogin: true })
            break
          }
        }
        setRuntime({ batchDone: report.done + report.failed + report.conflicts })
      }
      // Invalidación agrupada al final del lote (§6.9).
      if (queryClientRef) {
        for (const key of invalidate.values()) void queryClientRef.invalidateQueries({ queryKey: key })
      }
      if (report.done + report.failed + report.conflicts > 0) onBatchEnd?.(report)
      await purgeDone()
    })
  } catch (error) {
    console.warn("[outbox] lote interrumpido", error)
  } finally {
    running = false
    setRuntime({ syncing: false })
    onIdle?.()
    const pendingRetry = outboxStore
      .getOps()
      .filter((o) => o.status === "retry" || o.status === "pending")
      .map((o) => o.nextAttemptAt)
    if (pendingRetry.length > 0) scheduleSync(Math.max(1_000, Math.min(...pendingRetry) - Date.now()))
  }
}

// ---- Acciones de la UI -------------------------------------------------------

export async function retryOp(id: string) {
  await patchOp(id, { status: "retry", nextAttemptAt: Date.now(), lastError: null })
  scheduleSync(0)
}

export async function retryAll() {
  for (const op of outboxStore.getOps().filter((o) => ["retry", "rejected", "blocked"].includes(o.status))) {
    await patchOp(op.id, { status: "retry", nextAttemptAt: Date.now() })
  }
  scheduleSync(0)
}

/** Descarta la op y sus dependientes (con confirmación en la UI). */
export async function discardOp(id: string) {
  const all = outboxStore.getOps()
  const ids = [id, ...dependentsOf(all, id).map((o) => o.id)]
  await deleteOps(ids)
  await logEvent({ level: "info", event: "discard", opId: id, data: { cascade: ids.length - 1 } })
  if (queryClientRef) await invalidateAfterDiscard(all.filter((o) => ids.includes(o.id)))
}

async function invalidateAfterDiscard(ops: OutboxOp[]) {
  for (const op of ops) {
    const handler = getOutboxHandler(op.kind)
    for (const key of handler?.invalidates(op.payload as never) ?? []) {
      void queryClientRef?.invalidateQueries({ queryKey: key })
    }
  }
}

/** "Conservar el mío": reenvía sobre la versión del servidor. */
export async function resolveKeepMine(id: string) {
  const op = outboxStore.getOps().find((o) => o.id === id)
  if (!op?.conflict) return
  const handler = getOutboxHandler(op.kind)
  const payload = handler?.rebase ? handler.rebase(op.payload as never, op.conflict) : op.payload
  await patchOp(id, {
    payload,
    status: "retry",
    conflict: null,
    lastError: null,
    nextAttemptAt: Date.now(),
    // Body distinto: clave nueva (si no, el gateway responde 422 por reuso).
    idempotencyKey: crypto.randomUUID(),
  })
  scheduleSync(0)
}

/** "Usar el del servidor": descarta el cambio local. */
export async function resolveUseServer(id: string) {
  await discardOp(id)
}

export function pauseSync(value: boolean) {
  paused = value
}

let started = false

/** Disparadores (§6.1). Se llama una vez al arrancar. */
export function startOutbox() {
  if (started || typeof window === "undefined") return
  started = true
  connectivityStore.subscribe((state) => {
    if (state.status === "online") scheduleSync(0)
  })
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") scheduleSync(0)
  })
  onBroadcast((m) => {
    if (m.type === "wake") scheduleSync(0)
  })
  // Background Sync: el SW reenvía `outbox:wake` a las pestañas abiertas.
  navigator.serviceWorker?.addEventListener?.("message", (event: MessageEvent) => {
    if (event.data?.type === "outbox:wake") scheduleSync(0)
  })
  outboxStore.subscribe(() => undefined)
}

/** Pide al SW un `sync` (Chromium) para despertar la cola al volver la red. */
export async function requestBackgroundSync() {
  try {
    const reg = await navigator.serviceWorker?.ready
    const sync = (reg as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } })?.sync
    await sync?.register("ce-outbox")
  } catch {
    // Sin Background Sync (Firefox/Safari): alcanzan los disparadores en página.
  }
}

/** Solo tests. */
export function __resetEngineForTests() {
  running = false
  paused = false
  if (timer) clearTimeout(timer)
  timer = undefined
}

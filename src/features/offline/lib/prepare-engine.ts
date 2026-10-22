/**
 * Motor de "Preparar para usar sin conexión" (plan §7.9, `add-offline-meses-pwa`
 * D-6/D-14). Lo usan el diálogo (a mano) y la autopreparación en segundo
 * plano (`auto-prepare.ts`): una sola corrida a la vez para todo el equipo,
 * con progreso observable, punto de control reanudable y "última
 * preparación" por usuario.
 *
 * Cada tarea baja una query con la MISMA key y `queryFn` que usa la pantalla
 * (las que tienen `meta.offline` quedan persistidas por el persister). Una
 * tarea puede devolver tareas nuevas (una lista devuelve el detalle de cada
 * elemento): se agregan al final y suman al total.
 *
 * Incremental: la autopreparación pasa `staleTime` > 0 y no vuelve a bajar lo
 * que se refrescó hace poco (TanStack devuelve lo que ya tiene). "Preparar" a
 * mano pasa 0: baja todo de nuevo.
 */
import { hashKey, type QueryClient, type QueryKey } from "@tanstack/react-query"

import { isCheckpointUsable, type PrepareCheckpoint } from "@/components/offline/prepare-offline-plan"
import Axios from "axios"

import { isNetworkError } from "@/lib/network-error"
import { connectivityStore } from "@/lib/offline/connectivity"
import { describePrepareKey } from "@/features/offline/lib/prepare-labels"
import { getMeta, isIndexedDbAvailable, setMeta } from "@/lib/offline/db"
import { getActivePersistUser } from "@/lib/offline/query-persister"
import { QUOTA_WARN_RATIO } from "@/lib/offline/storage-status"

export interface PrepareContext {
  /** Bytes de archivos guardados en la corrida (se muestran al terminar). */
  stats: { archivoBytes: number }
  /** 0 = bajar todo; > 0 = no volver a bajar lo más nuevo que esto. */
  staleTime: number
}

export interface PrepareTask {
  queryKey: QueryKey
  run: (queryClient: QueryClient, ctx: PrepareContext) => Promise<PrepareTask[] | void>
  /** Si falla no cuenta como error (depende del rol, dato accesorio). */
  optional?: boolean
  /** Devuelve tareas hijas: al reanudar se repite aunque ya estuviera hecha. */
  expands?: boolean
}

export type PrepareOrigin = "manual" | "auto"
export type PrepareOutcome = "ok" | "parcial" | "sin-espacio" | "sin-conexion" | "cancelada"

export interface PrepareSnapshot {
  running: boolean
  origin: PrepareOrigin | null
  /** Primera preparación de este usuario en el equipo (se muestra el progreso). */
  firstRun: boolean
  done: number
  total: number
  failed: PrepareTask[]
  /** Qué falló, legible ("Planeador › Planilla (grupo 12)") y por qué. */
  failedDetails: PrepareFailure[]
  /** Pausada esperando que vuelva la red (confirmado por el heartbeat). */
  paused: boolean
  /** Última preparación COMPLETA del usuario activo (ms), o `null`. */
  lastPrepareAt: number | null
  lastOutcome: PrepareOutcome | null
  archivoBytes: number | null
  /**
   * Hay una corrida en OTRA pestaña (Web Locks + BroadcastChannel): esta solo
   * muestra su progreso. `null` si no.
   */
  remote: { origin: PrepareOrigin; done: number; total: number } | null
}

export interface PrepareFailure {
  label: string
  message: string
}

const INITIAL: PrepareSnapshot = {
  running: false,
  origin: null,
  firstRun: false,
  done: 0,
  total: 0,
  failed: [],
  failedDetails: [],
  paused: false,
  lastPrepareAt: null,
  lastOutcome: null,
  archivoBytes: null,
  remote: null,
}

let snapshot: PrepareSnapshot = INITIAL
let loadedFor: string | null = null
let current: Promise<PrepareSnapshot> | null = null
let cancelRequested = false
/** Despierta una pausa por falta de red (lo usa "Cancelar"). */
let wakePause: (() => void) | null = null
const listeners = new Set<() => void>()

function set(patch: Partial<PrepareSnapshot>) {
  snapshot = { ...snapshot, ...patch }
  for (const listener of listeners) listener()
  if (current && snapshot.running && ("done" in patch || "total" in patch)) broadcastProgress()
}

// ---- Una sola corrida para todo el equipo (entre pestañas) ------------------
//
// Igual que el outbox (`ce-outbox`): la pestaña que toma el Web Lock
// `ce-offline-prepare` corre; las demás no arrancan otra y muestran el
// progreso que ésta difunde por `BroadcastChannel`. "Cancelar" desde otra
// pestaña viaja por el mismo canal.

const LOCK_NAME = "ce-offline-prepare"
const CHANNEL_NAME = "ce-offline-prepare"

type PrepareMessage =
  | { type: "progress"; origin: PrepareOrigin; done: number; total: number }
  | { type: "done"; lastPrepareAt: number | null }
  | { type: "cancel" }

let channel: BroadcastChannel | null = null
let lastBroadcast = 0

function getChannel(): BroadcastChannel | null {
  if (channel || typeof BroadcastChannel === "undefined") return channel
  channel = new BroadcastChannel(CHANNEL_NAME)
  channel.onmessage = (event: MessageEvent<PrepareMessage>) => {
    const msg = event.data
    if (msg.type === "cancel") {
      if (current) cancelPrepare()
    } else if (msg.type === "progress") {
      if (!current) set({ remote: { origin: msg.origin, done: msg.done, total: msg.total } })
    } else if (msg.type === "done") {
      set({ remote: null, lastPrepareAt: msg.lastPrepareAt ?? snapshot.lastPrepareAt })
    }
  }
  return channel
}

function post(msg: PrepareMessage) {
  try {
    getChannel()?.postMessage(msg)
  } catch {
    // Canal cerrado: las otras pestañas se enteran al recargar.
  }
}

function broadcastProgress() {
  // Como mucho ~4 mensajes por segundo: el progreso no necesita más.
  const now = Date.now()
  if (now - lastBroadcast < 250 && snapshot.done !== snapshot.total) return
  lastBroadcast = now
  post({ type: "progress", origin: snapshot.origin ?? "manual", done: snapshot.done, total: snapshot.total })
}

/** Engancha el canal (para ver el progreso de otra pestaña sin correr nada). */
export function listenPrepareChannel(): void {
  getChannel()
}

async function withPrepareLock<T>(fn: () => Promise<T>): Promise<{ acquired: boolean; value?: T }> {
  const locks = typeof navigator !== "undefined" ? (navigator as Navigator & { locks?: LockManager }).locks : undefined
  if (!locks?.request) return { acquired: true, value: await fn() }
  let result: { acquired: boolean; value?: T } = { acquired: false }
  await locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => {
    if (!lock) return
    result = { acquired: true, value: await fn() }
  })
  return result
}

/**
 * Corta la corrida en curso (en esta pestaña o en otra). Lo hecho queda en el
 * punto de control: "Continuar" sigue desde ahí.
 */
export function cancelPrepare(): void {
  if (current) {
    cancelRequested = true
    wakePause?.()
  } else if (snapshot.remote) post({ type: "cancel" })
}

export const prepareStore = {
  getSnapshot: (): PrepareSnapshot => snapshot,
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

// ---- Última preparación (por usuario) -------------------------------------

/** Clave vieja (global, antes de que fuera por usuario): se lee como respaldo. */
const LEGACY_LAST_PREPARE_KEY = "ce-offline-last-prepare"
const CHECKPOINT_KEY = "ce-offline-prepare-checkpoint"
export const lastPrepareMetaKey = (sub: string) => `lastPrepare:${sub}`

function readLegacyLastPrepare(): number | null {
  try {
    const value = Number(localStorage.getItem(LEGACY_LAST_PREPARE_KEY))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

/** Carga "última preparación" del usuario activo (al entrar o cambiar de usuario). */
export async function loadPrepareStatus(sub: string | null = getActivePersistUser()): Promise<void> {
  if (sub === loadedFor) return
  loadedFor = sub
  if (!sub) {
    set({ lastPrepareAt: null, lastOutcome: null })
    return
  }
  let last: number | null = null
  if (isIndexedDbAvailable()) last = (await getMeta<number>(lastPrepareMetaKey(sub)).catch(() => undefined)) ?? null
  if (loadedFor === sub) set({ lastPrepareAt: last ?? readLegacyLastPrepare(), lastOutcome: null })
}

async function saveLastPrepare(at: number) {
  const sub = getActivePersistUser()
  set({ lastPrepareAt: at })
  try {
    localStorage.setItem(LEGACY_LAST_PREPARE_KEY, String(at))
  } catch {
    // Sin storage: queda el valor en IndexedDB.
  }
  if (sub && isIndexedDbAvailable()) await setMeta(lastPrepareMetaKey(sub), at).catch(() => undefined)
}

export function readCheckpoint(): PrepareCheckpoint | null {
  try {
    const raw = localStorage.getItem(CHECKPOINT_KEY)
    return raw ? (JSON.parse(raw) as PrepareCheckpoint) : null
  } catch {
    return null
  }
}

function writeCheckpoint(cp: PrepareCheckpoint | null) {
  try {
    if (cp) localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(cp))
    else localStorage.removeItem(CHECKPOINT_KEY)
  } catch {
    // Sin storage: la preparación no se puede reanudar, solo repetir.
  }
}

/** Hay una preparación cortada a medias que se puede continuar. */
export function hasResumableCheckpoint(): boolean {
  return isCheckpointUsable(readCheckpoint())
}

// ---- Cuota ----------------------------------------------------------------

/** `true` si el almacenamiento del equipo ya pasó el umbral de aviso (80 %). */
export async function isStorageNearlyFull(): Promise<boolean> {
  try {
    const estimate = await navigator.storage?.estimate?.()
    if (!estimate?.quota || estimate.usage == null) return false
    return estimate.usage / estimate.quota >= QUOTA_WARN_RATIO
  } catch {
    return false
  }
}

/**
 * Cede el hilo entre tareas: la corrida va en segundo plano y la pantalla que
 * el docente está usando tiene prioridad (clics, tipeo, navegación). Con
 * `scheduler.yield` la cola sigue enseguida; sin él, un `setTimeout` deja
 * pasar los eventos pendientes.
 */
export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler
  if (scheduler?.yield) return scheduler.yield()
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/** Cede el hilo hasta que el navegador esté ocioso (autopreparación). */
function idle(): Promise<void> {
  return new Promise((resolve) => {
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback
    if (ric) ric(() => resolve(), { timeout: 1_000 })
    else setTimeout(resolve, 50)
  })
}

// ---- Corrida ----------------------------------------------------------------

export interface RunPrepareOptions {
  origin: PrepareOrigin
  /** Saltea lo que quedó hecho en el punto de control (< 24 h). */
  resume?: boolean
  /** Ver `PrepareContext.staleTime`. */
  staleTime?: number
  /** Cuánto se espera a que vuelva la red antes de dejarla "sin conexión". */
  maxPauseMs?: number
}

/** Pausa máxima esperando la red: después queda reanudable con "Continuar". */
export const PREPARE_MAX_PAUSE_MS = 10 * 60 * 1000

/** ¿Hay una corrida en curso (manual o automática, en esta pestaña u otra)? */
export function isPreparing(): boolean {
  return current != null || snapshot.remote != null
}

/** Espera a que el heartbeat diga que hay red (o se agote `maxMs`). */
function waitForConnection(maxMs: number): Promise<boolean> {
  if (connectivityStore.getState().status !== "offline") return Promise.resolve(true)
  if (maxMs <= 0) return Promise.resolve(false)
  return new Promise((resolve) => {
    const done = (ok: boolean) => {
      clearTimeout(timer)
      unsubscribe()
      wakePause = null
      resolve(ok)
    }
    // "Cancelar" corta también la espera.
    wakePause = () => done(false)
    const timer = setTimeout(() => done(false), maxMs)
    const unsubscribe = connectivityStore.subscribe((s) => {
      if (s.status !== "offline") done(true)
    })
  })
}

/** Por qué falló un elemento, en castellano (va en el detalle del diálogo). */
function failureMessage(error: unknown): string {
  if (Axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return "el servidor tardó demasiado en responder"
    const status = error.response?.status
    if (status != null) return `el servidor respondió con error ${status}`
    return "no hubo respuesta del servidor"
  }
  return error instanceof Error && error.message ? error.message : "error desconocido"
}

/**
 * Corre las tareas en serie (no satura una red escolar lenta y da progreso
 * real). Si ya hay una corrida en curso devuelve esa (no arranca otra).
 *
 * Un elemento que falla (4xx/5xx/timeout) se anota y se sigue con el resto:
 * NO significa que se cortó la red. Solo cuando el heartbeat confirma que no
 * hay conexión (`connectivityStore` en `offline`) la corrida se PAUSA y sigue
 * sola cuando vuelve; si no vuelve en `maxPauseMs`, queda "sin-conexion" con
 * lo hecho en el punto de control. En segundo plano, además, se corta si el
 * almacenamiento del equipo se llena.
 */
export function runPrepare(
  queryClient: QueryClient,
  initial: PrepareTask[],
  options: RunPrepareOptions,
): Promise<PrepareSnapshot> {
  if (current != null) return current
  // Otra pestaña ya está preparando: no se arranca otra.
  if (snapshot.remote != null) return Promise.resolve(snapshot)
  getChannel()
  cancelRequested = false
  const run: Promise<PrepareSnapshot> = withPrepareLock(() => execute(queryClient, initial, options))
    .then(({ acquired, value }) => {
      if (!acquired) return snapshot
      post({ type: "done", lastPrepareAt: snapshot.lastPrepareAt })
      return value ?? snapshot
    })
    .finally(() => {
      current = null
      cancelRequested = false
    })
  current = run
  return run
}

async function execute(
  queryClient: QueryClient,
  initial: PrepareTask[],
  { origin, resume = false, staleTime = 0, maxPauseMs = PREPARE_MAX_PAUSE_MS }: RunPrepareOptions,
): Promise<PrepareSnapshot> {
  const queue = [...initial]
  const ctx: PrepareContext = { stats: { archivoBytes: 0 }, staleTime }
  const failed: PrepareTask[] = []
  const failedDetails: PrepareFailure[] = []
  // Tareas ya reintentadas tras una pausa por falta de red (una vez cada una).
  const reintentadas = new Set<string>()
  const previo = readCheckpoint()
  const checkpoint: PrepareCheckpoint =
    resume && isCheckpointUsable(previo) ? previo : { startedAt: Date.now(), done: [] }
  const hechas = new Set(checkpoint.done)
  writeCheckpoint(checkpoint)
  set({
    running: true,
    origin,
    firstRun: snapshot.lastPrepareAt == null,
    done: 0,
    total: queue.length,
    failed: [],
    failedDetails: [],
    paused: false,
    lastOutcome: null,
    archivoBytes: null,
    remote: null,
  })

  let outcome: PrepareOutcome = "ok"
  for (let i = 0; i < queue.length; i++) {
    // Serie (concurrencia 1) y cediendo el hilo antes de cada tarea: la red
    // escolar no se satura y la pantalla sigue respondiendo. El cifrado y la
    // escritura en IndexedDB ya van agrupados por el persister (throttle 1 s).
    if (origin === "auto") await idle()
    else await yieldToMain()
    if (cancelRequested) {
      outcome = "cancelada"
      break
    }
    if (connectivityStore.getState().status === "offline") {
      set({ paused: true })
      const volvio = await waitForConnection(maxPauseMs)
      set({ paused: false })
      if (cancelRequested) {
        outcome = "cancelada"
        break
      }
      if (!volvio) {
        outcome = "sin-conexion"
        break
      }
    }
    if (origin === "auto" && i % 25 === 0 && (await isStorageNearlyFull())) {
      outcome = "sin-espacio"
      break
    }
    const task = queue[i]
    const hash = hashKey(task.queryKey)
    // Las tareas que expanden a otras (listas) se repiten siempre: sus hijas
    // sí se saltan si ya estaban.
    // Solo se salta si el dato SIGUE en el cache: el checkpoint vive en
    // localStorage (global, no por usuario) y sobrevive a un logout/borrado
    // de datos o a una corrida "parcial". Sin este chequeo, una reanudación
    // (la autopreparación siempre reanuda) marcaba la lista de establecimientos
    // como hecha sin bajarla y el encabezado decía "Datos guardados" igual.
    const enCache = queryClient.getQueryState(task.queryKey)?.data !== undefined
    if (hechas.has(hash) && enCache && !task.expands && task.queryKey[0] !== "offline") {
      set({ done: i + 1 })
      continue
    }
    try {
      const extra = await task.run(queryClient, ctx)
      if (extra?.length) {
        queue.push(...extra)
        set({ total: queue.length })
      }
      hechas.add(hash)
      if (i % 10 === 0) writeCheckpoint({ ...checkpoint, done: [...hechas] })
    } catch (error) {
      // Falló por la red Y el heartbeat ya confirmó que no hay conexión: no es
      // culpa del elemento. Se repite (una vez) cuando vuelva la red; la
      // pausa la hace el chequeo del principio de la vuelta.
      if (
        isNetworkError(error) &&
        connectivityStore.getState().status === "offline" &&
        !reintentadas.has(hash)
      ) {
        reintentadas.add(hash)
        i--
        continue
      }
      // Deja rastro de qué key falló: sin esto un "parcial" no dice qué pantalla
      // quedó sin guardar.
      // 403 = el usuario no tiene alcance sobre ese dato: no aplica para su rol,
      // no es una falla de la preparación (no se reintenta ni se reporta).
      const noAplica = Axios.isAxiosError(error) && error.response?.status === 403
      if (noAplica) {
        hechas.add(hash)
        set({ done: i + 1 })
        continue
      }
      console.warn("[offline] preparar falló", JSON.stringify(task.queryKey), error)
      if (!task.optional) {
        failed.push(task)
        failedDetails.push({ label: describePrepareKey(task.queryKey), message: failureMessage(error) })
      }
    }
    set({ done: i + 1 })
  }

  if (outcome === "ok" && failed.length > 0) outcome = "parcial"
  // Una corrida que llegó al final cuenta como "datos guardados" aunque
  // fallaran algunos elementos (el diálogo ofrece reintentarlos); una cortada
  // por la red o el espacio no.
  if (outcome === "ok" || outcome === "parcial") await saveLastPrepare(Date.now())
  writeCheckpoint(outcome === "ok" ? null : { ...checkpoint, done: [...hechas] })
  set({
    running: false,
    paused: false,
    failed,
    failedDetails,
    lastOutcome: outcome,
    archivoBytes: ctx.stats.archivoBytes > 0 ? ctx.stats.archivoBytes : null,
  })
  return snapshot
}

/** Progreso de la corrida (de esta pestaña o de otra), 0-100. */
export function preparePercent(s: PrepareSnapshot): number {
  const { done, total } = s.remote ?? s
  return total ? Math.round((done / total) * 100) : 0
}

/** Solo para tests. */
export function __resetPrepareForTests() {
  snapshot = INITIAL
  loadedFor = null
  current = null
  cancelRequested = false
  lastBroadcast = 0
}

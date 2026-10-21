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
import { connectivityStore } from "@/lib/offline/connectivity"
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
export type PrepareOutcome = "ok" | "parcial" | "sin-espacio" | "sin-conexion"

export interface PrepareSnapshot {
  running: boolean
  origin: PrepareOrigin | null
  /** Primera preparación de este usuario en el equipo (se muestra el progreso). */
  firstRun: boolean
  done: number
  total: number
  failed: PrepareTask[]
  /** Última preparación COMPLETA del usuario activo (ms), o `null`. */
  lastPrepareAt: number | null
  lastOutcome: PrepareOutcome | null
  archivoBytes: number | null
}

const INITIAL: PrepareSnapshot = {
  running: false,
  origin: null,
  firstRun: false,
  done: 0,
  total: 0,
  failed: [],
  lastPrepareAt: null,
  lastOutcome: null,
  archivoBytes: null,
}

let snapshot: PrepareSnapshot = INITIAL
let loadedFor: string | null = null
let current: Promise<PrepareSnapshot> | null = null
const listeners = new Set<() => void>()

function set(patch: Partial<PrepareSnapshot>) {
  snapshot = { ...snapshot, ...patch }
  for (const listener of listeners) listener()
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

/** Cede el hilo entre tareas en segundo plano para no trabar la pantalla. */
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
}

/** ¿Hay una corrida en curso (manual o automática)? */
export function isPreparing(): boolean {
  return current != null
}

/**
 * Corre las tareas en serie (no satura una red escolar lenta y da progreso
 * real). Si ya hay una corrida en curso devuelve esa (no arranca otra). Se
 * corta sin red (lo hecho queda en el punto de control) y, en segundo plano,
 * si el almacenamiento del equipo se llena.
 */
export function runPrepare(
  queryClient: QueryClient,
  initial: PrepareTask[],
  options: RunPrepareOptions,
): Promise<PrepareSnapshot> {
  if (current != null) return current
  current = execute(queryClient, initial, options).finally(() => {
    current = null
  })
  return current
}

async function execute(
  queryClient: QueryClient,
  initial: PrepareTask[],
  { origin, resume = false, staleTime = 0 }: RunPrepareOptions,
): Promise<PrepareSnapshot> {
  const queue = [...initial]
  const ctx: PrepareContext = { stats: { archivoBytes: 0 }, staleTime }
  const failed: PrepareTask[] = []
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
    lastOutcome: null,
    archivoBytes: null,
  })

  let outcome: PrepareOutcome = "ok"
  for (let i = 0; i < queue.length; i++) {
    if (connectivityStore.getState().status === "offline") {
      outcome = "sin-conexion"
      break
    }
    if (origin === "auto") {
      await idle()
      if (i % 25 === 0 && (await isStorageNearlyFull())) {
        outcome = "sin-espacio"
        break
      }
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
      // Deja rastro de qué key falló: sin esto un "parcial" no dice qué pantalla
      // quedó sin guardar.
      console.warn("[offline] preparar falló", JSON.stringify(task.queryKey), error)
      if (!task.optional) failed.push(task)
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
    failed,
    lastOutcome: outcome,
    archivoBytes: ctx.stats.archivoBytes > 0 ? ctx.stats.archivoBytes : null,
  })
  return snapshot
}

/** Solo para tests. */
export function __resetPrepareForTests() {
  snapshot = INITIAL
  loadedFor = null
  current = null
}

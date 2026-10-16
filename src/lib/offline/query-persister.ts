/**
 * Persistencia selectiva del cache de TanStack Query en IndexedDB (D2, §5).
 *
 * No es el `PersistQueryClientProvider` (que serializa el cliente entero en un
 * blob): acá cada query es una fila de `queries` con clave `[userSub,
 * queryHash]`, así se puede borrar por usuario, aplicar TTL por query y un
 * presupuesto LRU sin reescribir todo en cada cambio.
 *
 * Contrato para quien marca queries (lista blanca, nada se persiste por
 * defecto):
 *
 * ```ts
 * useQuery({
 *   queryKey, queryFn,
 *   meta: { offline: { ttl: OFFLINE_TTL.roster }, persistSelect: (data) => recortar(data) },
 * })
 * ```
 *
 * - Solo se persisten queries EXITOSAS con `meta.offline`; los errores nunca.
 * - `persistSelect` (si está) se aplica antes de guardar: lo restaurado tiene
 *   ESA forma, así que tiene que seguir siendo válido para la pantalla
 *   (pensado para quitar documento/acudiente/salud de estudiantes, §9 C-72).
 * - `buster = "${userSub}:${SCHEMA_VERSION}"`: subir `SCHEMA_VERSION` en un
 *   deploy invalida todo lo persistido.
 * - Escrituras agrupadas con throttle de 1 s; una entrada > 2 MB no se guarda;
 *   presupuesto de 50 MB por usuario con expulsión LRU (vencidas primero).
 * - En modo "equipo compartido" (o sin usuario activo) no se escribe nada.
 */
import { hydrate, type DehydratedState, type Query, type QueryClient } from "@tanstack/react-query"

import { OFFLINE_MAX_MS } from "@/lib/offline/limits"
import {
  deleteMeta,
  getDb,
  getMeta,
  isIndexedDbAvailable,
  setMeta,
  type DeviceMode,
  type PersistedQueryRow,
} from "@/lib/offline/db"

/** Subirlo cuando cambie la forma de cualquier dato persistido. */
export const SCHEMA_VERSION = 1

export const PERSIST_THROTTLE_MS = 1000
export const MAX_ENTRY_BYTES = 2 * 1024 * 1024
export const USER_BUDGET_BYTES = 50 * 1024 * 1024

const DAY_MS = 864e5

/** TTL duros sugeridos (§8): catálogos 30 d, datos de grupo 7 d, detalle 3 d. */
export const OFFLINE_TTL = {
  catalog: 30 * DAY_MS,
  roster: 7 * DAY_MS,
  detail: 3 * DAY_MS,
} as const

export interface OfflineQueryOptions {
  /** Tiempo máximo (ms) que se restaura desde `dataUpdatedAt`. */
  ttl: number
  scope?: "user"
}

export interface OfflineQueryMeta {
  offline?: OfflineQueryOptions
  persistSelect?: (data: unknown) => unknown
}

// `meta` de TanStack es `Record<string, unknown>`: esto da autocompletado
// sin cambiar el tipo global.
declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: Record<string, unknown> & OfflineQueryMeta
  }
}

export const DEVICE_MODE_KEY = "deviceMode"
export const LAST_USER_KEY = "lastUserSub"
/** Mientras P6 siga pendiente (§0.3), lo conservador. */
export const DEFAULT_DEVICE_MODE: DeviceMode = "compartido"

export const makeBuster = (userSub: string) => `${userSub}:${SCHEMA_VERSION}`

// ---- Estado del módulo ----------------------------------------------------

let deviceMode: DeviceMode = DEFAULT_DEVICE_MODE
let activeUser: string | null = null
let unsubscribe: (() => void) | null = null
let flushTimer: ReturnType<typeof setTimeout> | undefined
const dirty = new Map<string, Query>()
let initPromise: Promise<void> | null = null

export function getDeviceMode(): DeviceMode {
  return deviceMode
}

export function getActivePersistUser(): string | null {
  return activeUser
}

function canPersist(): boolean {
  return isIndexedDbAvailable() && deviceMode === "personal" && activeUser != null
}

/**
 * Lee el modo del equipo una vez al arrancar. Idempotente: el guard de `/app`
 * lo espera antes de decidir la sesión.
 */
export function initOfflinePersistence(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      if (!isIndexedDbAvailable()) return
      try {
        const stored = await getMeta<DeviceMode>(DEVICE_MODE_KEY)
        deviceMode = stored === "personal" ? "personal" : DEFAULT_DEVICE_MODE
      } catch {
        deviceMode = DEFAULT_DEVICE_MODE
      }
    })()
  }
  return initPromise
}

/**
 * Cambia el modo del equipo. Pasar a "compartido" borra TODO lo persistido
 * (de cualquier usuario): un equipo compartido no guarda nada.
 */
export async function setDeviceMode(mode: DeviceMode): Promise<void> {
  deviceMode = mode
  if (mode === "compartido") clearArchivos()
  if (!isIndexedDbAvailable()) return
  await setMeta(DEVICE_MODE_KEY, mode)
  if (mode === "compartido") {
    cancelPendingWrites()
    const db = await getDb()
    const tx = db.transaction(["queries", "session"], "readwrite")
    await Promise.all([tx.objectStore("queries").clear(), tx.objectStore("session").clear(), tx.done])
    await deleteMeta(LAST_USER_KEY)
  }
}

// ---- Escritura --------------------------------------------------------------

function cancelPendingWrites() {
  clearTimeout(flushTimer)
  flushTimer = undefined
  dirty.clear()
}

const encoder = new TextEncoder()

function toRow(query: Query, userSub: string, now: number): PersistedQueryRow | null {
  const meta = query.meta as OfflineQueryMeta | undefined
  const offline = meta?.offline
  if (!offline || query.state.status !== "success" || query.state.data === undefined) return null
  const data = meta.persistSelect ? meta.persistSelect(query.state.data) : query.state.data
  let json: string
  try {
    json = JSON.stringify(data)
  } catch {
    return null
  }
  if (json === undefined) return null
  const size = encoder.encode(json).byteLength
  if (size > MAX_ENTRY_BYTES) {
    console.warn(`[offline] query ${query.queryHash} pesa ${size} B (> 2 MB): no se persiste`)
    return null
  }
  return {
    userSub,
    queryHash: query.queryHash,
    queryKey: query.queryKey as unknown[],
    buster: makeBuster(userSub),
    data: json,
    dataUpdatedAt: query.state.dataUpdatedAt,
    updatedAt: now,
    ttl: offline.ttl,
    size,
  }
}

/** Escribe ya lo pendiente (lo usa el throttle; exportado para tests). */
export async function flushPersistQueue(now = Date.now()): Promise<void> {
  clearTimeout(flushTimer)
  flushTimer = undefined
  const userSub = activeUser
  const queries = [...dirty.values()]
  dirty.clear()
  if (!canPersist() || !userSub || queries.length === 0) return
  const rows = queries
    .map((query) => toRow(query, userSub, now))
    .filter((row): row is PersistedQueryRow => row != null)
  if (rows.length === 0) return
  try {
    const db = await getDb()
    // El usuario pudo cambiar mientras se abría la base: no mezclar filas.
    if (activeUser !== userSub || deviceMode !== "personal") return
    const tx = db.transaction("queries", "readwrite")
    await Promise.all([...rows.map((row) => tx.store.put(row)), tx.done])
    await enforceBudget(userSub, now)
  } catch (error) {
    console.warn("[offline] no se pudo persistir el cache", error)
  }
}

function scheduleFlush() {
  if (flushTimer !== undefined) return
  flushTimer = setTimeout(() => void flushPersistQueue(), PERSIST_THROTTLE_MS)
}

/** LRU por `updatedAt`, expulsando primero las vencidas. */
async function enforceBudget(userSub: string, now: number) {
  const db = await getDb()
  const rows = await db.getAllFromIndex("queries", "byUser", userSub)
  let total = rows.reduce((sum, row) => sum + row.size, 0)
  if (total <= USER_BUDGET_BYTES) return
  const expired = (row: PersistedQueryRow) => now - row.dataUpdatedAt > row.ttl
  const ordered = [...rows].sort(
    (a, b) => Number(expired(b)) - Number(expired(a)) || a.updatedAt - b.updatedAt,
  )
  const tx = db.transaction("queries", "readwrite")
  for (const row of ordered) {
    if (total <= USER_BUDGET_BYTES) break
    total -= row.size
    void tx.store.delete([row.userSub, row.queryHash])
  }
  await tx.done
}

/**
 * Escucha el cache y encola las queries con `meta.offline` que terminan bien.
 * Las que salen del cache (gc) NO se borran de IndexedDB: justamente sirven
 * para cuando no hay red.
 */
export function startQueryPersister(queryClient: QueryClient): () => void {
  unsubscribe?.()
  const unsub = queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== "updated" || event.action.type !== "success") return
    if (!(event.query.meta as OfflineQueryMeta | undefined)?.offline) return
    if (!canPersist()) return
    dirty.set(event.query.queryHash, event.query)
    scheduleFlush()
  })
  unsubscribe = () => {
    unsub()
    unsubscribe = null
  }
  return unsubscribe
}

// ---- Lectura / usuario activo ---------------------------------------------

/** Cuánto vive en memoria una query restaurada sin observadores. */
const RESTORED_GC_MS = 24 * 60 * 60 * 1000

/**
 * Restaura en el cache las filas vigentes de `userSub` (y borra las vencidas
 * o de otro esquema). Solo lee filas de ESE usuario.
 */
export async function restoreUserQueries(
  queryClient: QueryClient,
  userSub: string,
  now = Date.now(),
): Promise<number> {
  if (!isIndexedDbAvailable() || deviceMode !== "personal") return 0
  const db = await getDb()
  const rows = await db.getAllFromIndex("queries", "byUser", userSub)
  const buster = makeBuster(userSub)
  const stale = rows.filter(
    // El `ttl` de la fila solo marca el dato como viejo (`freshness.ts`); se
    // BORRA recién pasada la duración máxima offline: un docente que lleva meses
    // sin red sigue viendo su roster aunque esté marcado como antiguo.
    (row) =>
      row.userSub !== userSub || row.buster !== buster || now - row.dataUpdatedAt > Math.max(row.ttl, OFFLINE_MAX_MS),
  )
  const valid = rows.filter((row) => !stale.includes(row))
  if (stale.length > 0) {
    const tx = db.transaction("queries", "readwrite")
    await Promise.all([...stale.map((row) => tx.store.delete([row.userSub, row.queryHash])), tx.done])
  }
  const state: DehydratedState = {
    mutations: [],
    queries: valid.map((row) => ({
      queryHash: row.queryHash,
      queryKey: row.queryKey,
      state: {
        data: JSON.parse(row.data) as unknown,
        dataUpdateCount: 1,
        dataUpdatedAt: row.dataUpdatedAt,
        error: null,
        errorUpdateCount: 0,
        errorUpdatedAt: 0,
        fetchFailureCount: 0,
        fetchFailureReason: null,
        fetchMeta: null,
        isInvalidated: false,
        status: "success",
        fetchStatus: "idle",
      },
    })),
  }
  hydrate(queryClient, state, { defaultOptions: { queries: { gcTime: RESTORED_GC_MS } } })
  return valid.length
}

/**
 * Fija el usuario dueño de lo que se persiste. Si cambia respecto del
 * anterior, vacía del cache en memoria todo lo que no sea `keep` (el usuario
 * nuevo nunca ve datos del anterior) y restaura lo suyo.
 */
export async function activatePersistUser(
  queryClient: QueryClient,
  userSub: string,
  { keep = [] as readonly (readonly unknown[])[] } = {},
): Promise<void> {
  if (activeUser === userSub) return
  const previous = activeUser
  cancelPendingWrites()
  activeUser = userSub
  if (previous != null) {
    queryClient.removeQueries({
      predicate: (query) =>
        !keep.some((key) => JSON.stringify(key) === JSON.stringify(query.queryKey)),
    })
  }
  if (deviceMode !== "personal" || !isIndexedDbAvailable()) return
  try {
    await setMeta(LAST_USER_KEY, userSub)
    await restoreUserQueries(queryClient, userSub)
  } catch (error) {
    console.warn("[offline] no se pudo restaurar el cache", error)
  }
}

/** Deja de persistir (sin borrar nada). */
export function deactivatePersistUser() {
  cancelPendingWrites()
  activeUser = null
}

export async function getLastUserSub(): Promise<string | undefined> {
  if (!isIndexedDbAvailable()) return undefined
  return getMeta<string>(LAST_USER_KEY)
}

/**
 * Archivos guardados por "Incluir archivos" (`file-cache.ts`). Import
 * dinámico: `file-cache` arrastra el cliente HTTP y este módulo no debe
 * depender de él (ni de un posible ciclo con `api-client`).
 */
function clearArchivos() {
  void import("@/lib/offline/file-cache").then((m) => m.clearArchivosCache()).catch(() => undefined)
}

/** Borra queries + session del `sub` (logout, §5.5) y los archivos guardados. */
export async function clearUserData(userSub: string): Promise<void> {
  if (activeUser === userSub) deactivatePersistUser()
  clearArchivos()
  if (!isIndexedDbAvailable()) return
  const db = await getDb()
  const keys = await db.getAllKeysFromIndex("queries", "byUser", userSub)
  const tx = db.transaction(["queries", "session"], "readwrite")
  await Promise.all([
    ...keys.map((key) => tx.objectStore("queries").delete(key)),
    tx.objectStore("session").delete(userSub),
    tx.done,
  ])
  if ((await getMeta<string>(LAST_USER_KEY)) === userSub) await deleteMeta(LAST_USER_KEY)
}

/** Solo para tests. */
export function __resetPersisterForTests() {
  unsubscribe?.()
  cancelPendingWrites()
  activeUser = null
  deviceMode = DEFAULT_DEVICE_MODE
  initPromise = null
}

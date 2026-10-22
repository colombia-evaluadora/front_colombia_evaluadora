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
 * - Solo se escribe lo que CAMBIÓ (`add-offline-preparar-incremental`): cada
 *   fila guarda la huella (`hashString`) de su JSON; si una query vuelve a
 *   terminar bien con el mismo dato (Preparar la refrescó y nada cambió) no se
 *   cifra ni se escribe: solo se anota "verificado a las…" en un mapa
 *   liviano (`verified:<sub>` en `meta`), que al restaurar cuenta como la
 *   fecha del dato (indicador de antigüedad).
 */
import { hydrate, type DehydratedState, type Query, type QueryClient } from "@tanstack/react-query"

import type { RecordedRequest } from "@/lib/offline/conditional-requests"
import { hashString } from "@/lib/offline/content-hash"
import { OFFLINE_MAX_MS } from "@/lib/offline/limits"
import { isEncrypted, isVaultLocked, loadVault, openString, sealString } from "@/lib/offline/vault"
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
  /**
   * Dato accesorio (contador del header, asistente): si falta sin red, el
   * banner no avisa que la pantalla está incompleta (`lib/offline/missing-data.ts`).
   */
  offlineOptional?: boolean
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

// ---- Qué hay escrito (para no reescribir lo que no cambió) ------------------

interface PersistedEntry {
  /** Referencia del dato en memoria la última vez que se comparó. */
  ref: unknown
  /** Huella del JSON guardado (`data` en claro). */
  sig: string
  /** Huella de los validadores guardados. */
  vsig: string
}

/** Por `queryHash` del usuario activo. Se vacía al cambiar de usuario. */
const persisted = new Map<string, PersistedEntry>()
/** Última vez que el servidor confirmó el dato sin cambios (ms), por `queryHash`. */
const verified = new Map<string, number>()
let verifiedDirty = false
/** Lecturas con ETag que dieron cada query (`conditional-requests.ts`). */
const validators = new Map<string, RecordedRequest[]>()
/**
 * Dato (referencia) al que corresponden esos validadores. Si el dato en
 * memoria cambió por otro camino (la pantalla lo refrescó, una escritura
 * offline lo editó en el cache), los validadores ya no lo describen y no se
 * usan: un 304 no puede "confirmar" un dato que no salió de esas lecturas.
 */
const validatorsRef = new Map<string, unknown>()

const verifiedMetaKey = (sub: string) => `verified:${sub}`

export interface PersistStats {
  /** Filas cifradas y escritas en IndexedDB. */
  written: number
  /** Queries que terminaron bien con el mismo dato: no se reescribieron. */
  unchanged: number
}

let persistStats: PersistStats = { written: 0, unchanged: 0 }

export function getPersistStats(): PersistStats {
  return { ...persistStats }
}

export function resetPersistStats(): void {
  persistStats = { written: 0, unchanged: 0 }
}

/**
 * Validadores de una query para el dato que hay en memoria (`undefined` si no
 * tiene, o si el dato ya no es el que dieron esas lecturas).
 */
export function getQueryValidators(queryHash: string, currentData: unknown): readonly RecordedRequest[] | undefined {
  if (!validatorsRef.has(queryHash) || validatorsRef.get(queryHash) !== currentData) return undefined
  return validators.get(queryHash)
}

/**
 * Fija los validadores de una query (o los borra con `null`). Si cambian, la
 * fila se reescribe en la próxima escritura aunque el dato sea el mismo.
 */
export function setQueryValidators(
  queryHash: string,
  value: readonly RecordedRequest[] | null,
  query?: Query,
): void {
  if (value && value.length > 0 && query) {
    validators.set(queryHash, [...value])
    validatorsRef.set(queryHash, query.state.data)
  } else {
    validators.delete(queryHash)
    validatorsRef.delete(queryHash)
  }
  // La fila ya se escribió sin estos validadores (la escritura se adelantó):
  // se vuelve a encolar para guardarlos.
  const prev = persisted.get(queryHash)
  const vjson = validatorsJson(queryHash)
  if (query && prev && prev.vsig !== (vjson ? hashString(vjson) : "") && canPersist()) {
    if ((query.meta as OfflineQueryMeta | undefined)?.offline) {
      dirty.set(queryHash, query)
      scheduleFlush()
    }
  }
}

/** Cuándo se confirmó por última vez el dato de la query (o `undefined`). */
export function getVerifiedAt(queryHash: string): number | undefined {
  return verified.get(queryHash)
}

/**
 * El servidor confirmó que el dato sigue igual (304 o mismo contenido): se
 * anota sin tocar la fila cifrada. Se guarda con la próxima escritura.
 */
export function markVerified(queryHash: string, at: number = Date.now()): void {
  if ((verified.get(queryHash) ?? 0) >= at) return
  verified.set(queryHash, at)
  verifiedDirty = true
  if (canPersist()) scheduleFlush()
}

function validatorsJson(queryHash: string): string {
  const value = validators.get(queryHash)
  return value ? JSON.stringify(value) : ""
}

function resetWriteState() {
  persisted.clear()
  verified.clear()
  validators.clear()
  validatorsRef.clear()
  verifiedDirty = false
}

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
    resetWriteState()
    const db = await getDb()
    const tx = db.transaction(["queries", "session"], "readwrite")
    await Promise.all([tx.objectStore("queries").clear(), tx.objectStore("session").clear(), tx.done])
    const metaKeys = await db.getAllKeys("meta")
    await Promise.all(
      metaKeys.filter((key) => String(key).startsWith("verified:")).map((key) => deleteMeta(String(key))),
    )
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

/**
 * JSON pierde los `Date`: `JSON.stringify` los vuelve texto ISO y al restaurar
 * el dato llega como string, así que `fechaInicio.toLocaleDateString()` revienta
 * (pantalla "Algo salió mal" al abrir una actividad con datos guardados). Se
 * marcan al guardar y se reconstruyen al leer. Filas guardadas antes de este
 * cambio traen las fechas como texto: se corrigen solas al refrescar la query.
 */
const DATE_TAG = "__ce_date__"

export function stringifyPersisted(value: unknown): string {
  return JSON.stringify(value, function (this: Record<string, unknown>, key, v) {
    const raw = this[key]
    return raw instanceof Date ? { [DATE_TAG]: Number.isNaN(raw.getTime()) ? null : raw.toISOString() } : v
  })
}

export function parsePersisted(json: string): unknown {
  return JSON.parse(json, (_key, v) => {
    if (v && typeof v === "object" && !Array.isArray(v) && DATE_TAG in v && Object.keys(v).length === 1) {
      const iso = (v as Record<string, unknown>)[DATE_TAG]
      return typeof iso === "string" ? new Date(iso) : null
    }
    return v
  })
}

function toRow(query: Query, userSub: string, now: number): PersistedQueryRow | null {
  const meta = query.meta as OfflineQueryMeta | undefined
  const offline = meta?.offline
  if (!offline || query.state.status !== "success" || query.state.data === undefined) return null
  const data = meta.persistSelect ? meta.persistSelect(query.state.data) : query.state.data
  let json: string
  try {
    json = stringifyPersisted(data)
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

interface PendingWrite {
  row: PersistedQueryRow
  entry: PersistedEntry
}

/**
 * ¿Hay que escribir esta query? `null` = no (sin cambios, o no persistible).
 * Sin cambios la cuenta como verificada: el servidor la volvió a confirmar.
 */
function pendingWrite(query: Query, userSub: string, now: number): PendingWrite | null {
  const hash = query.queryHash
  const prev = persisted.get(hash)
  const vjson = validatorsJson(hash)
  const vsig = vjson ? hashString(vjson) : ""
  // Mismo objeto que la última vez (TanStack conserva la referencia si el
  // dato nuevo es igual, `structuralSharing`): ni siquiera se serializa.
  if (prev && prev.ref === query.state.data && prev.vsig === vsig) {
    persistStats.unchanged++
    markVerified(hash, query.state.dataUpdatedAt || now)
    return null
  }
  const row = toRow(query, userSub, now)
  if (!row) return null
  const sig = hashString(row.data)
  if (prev && prev.sig === sig && prev.vsig === vsig) {
    prev.ref = query.state.data
    persistStats.unchanged++
    markVerified(hash, query.state.dataUpdatedAt || now)
    return null
  }
  if (vjson) row.validators = vjson
  return { row, entry: { ref: query.state.data, sig, vsig } }
}

/** Escribe ya lo pendiente (lo usa el throttle; exportado para tests). */
export async function flushPersistQueue(now = Date.now()): Promise<void> {
  clearTimeout(flushTimer)
  flushTimer = undefined
  const userSub = activeUser
  const queries = [...dirty.values()]
  dirty.clear()
  if (!canPersist() || !userSub) return
  // Con PIN y la bóveda cerrada no se escribe nada: ni en claro ni sin clave.
  if (isVaultLocked()) return
  const writes = queries
    .map((query) => pendingWrite(query, userSub, now))
    .filter((w): w is PendingWrite => w != null)
  try {
    if (writes.length > 0) {
      // Cifrado en reposo (D-8): con la bóveda abierta `data` va como `enc1:`.
      const rows = await Promise.all(
        writes.map(async ({ row }) => ({
          ...row,
          data: await sealString(row.data),
          ...(row.validators && { validators: await sealString(row.validators) }),
        })),
      )
      const db = await getDb()
      // El usuario pudo cambiar mientras se abría la base: no mezclar filas.
      if (activeUser !== userSub || deviceMode !== "personal") return
      const tx = db.transaction("queries", "readwrite")
      await Promise.all([...rows.map((row) => tx.store.put(row)), tx.done])
      for (const { row, entry } of writes) persisted.set(row.queryHash, entry)
      persistStats.written += rows.length
      await enforceBudget(userSub, now)
    }
    if (verifiedDirty && activeUser === userSub) {
      verifiedDirty = false
      await setMeta(verifiedMetaKey(userSub), Object.fromEntries(verified))
    }
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
  // Una fila verificada hace poco (sin reescribirla) cuenta como reciente.
  const lastSeen = (row: PersistedQueryRow) => Math.max(row.updatedAt, verified.get(row.queryHash) ?? 0)
  const expired = (row: PersistedQueryRow) =>
    now - Math.max(row.dataUpdatedAt, verified.get(row.queryHash) ?? 0) > row.ttl
  const ordered = [...rows].sort(
    (a, b) => Number(expired(b)) - Number(expired(a)) || lastSeen(a) - lastSeen(b),
  )
  const tx = db.transaction("queries", "readwrite")
  for (const row of ordered) {
    if (total <= USER_BUDGET_BYTES) break
    total -= row.size
    // Expulsada: la próxima vez que termine bien se vuelve a escribir.
    persisted.delete(row.queryHash)
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
  const all = await db.getAllFromIndex("queries", "byUser", userSub)
  // Filas cifradas con la bóveda cerrada: ni se restauran ni se borran; se
  // leen al escribir el PIN (`restoreUserQueries` de nuevo).
  const rows = isVaultLocked() ? all.filter((row) => !isEncrypted(row.data)) : all
  const buster = makeBuster(userSub)
  // "Verificado a las…" (sin reescribir la fila): cuenta como la fecha del dato.
  const verifiedAt =
    (await getMeta<Record<string, number>>(verifiedMetaKey(userSub)).catch(() => undefined)) ?? {}
  const effectiveUpdatedAt = (row: PersistedQueryRow) =>
    Math.max(row.dataUpdatedAt, verifiedAt[row.queryHash] ?? 0)
  const opened = new Map<PersistedQueryRow, string | null>()
  const openedValidators = new Map<PersistedQueryRow, string>()
  for (const row of rows) {
    try {
      opened.set(row, await openString(row.data))
      if (row.validators) openedValidators.set(row, await openString(row.validators))
    } catch {
      opened.set(row, null) // clave distinta (PIN reiniciado): no se puede leer
    }
  }
  const stale = rows.filter(
    // El `ttl` de la fila solo marca el dato como viejo (`freshness.ts`); se
    // BORRA recién pasada la duración máxima offline: un docente que lleva meses
    // sin red sigue viendo su roster aunque esté marcado como antiguo.
    (row) =>
      opened.get(row) == null ||
      row.userSub !== userSub ||
      row.buster !== buster ||
      now - effectiveUpdatedAt(row) > Math.max(row.ttl, OFFLINE_MAX_MS),
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
        data: parsePersisted(opened.get(row) as string),
        dataUpdateCount: 1,
        dataUpdatedAt: effectiveUpdatedAt(row),
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
  // Lo que ya está escrito: una query que vuelva a terminar con el mismo dato
  // no se reescribe (`pendingWrite`).
  if (activeUser === userSub) {
    for (const [hash, at] of Object.entries(verifiedAt)) {
      if ((verified.get(hash) ?? 0) < at) verified.set(hash, at)
    }
    const cache = queryClient.getQueryCache()
    for (const row of valid) {
      const json = opened.get(row) as string
      const vjson = openedValidators.get(row) ?? ""
      const query = cache.get(row.queryHash)
      // Si en memoria había algo más nuevo, `hydrate` no lo pisó: esa
      // referencia no es la de la fila y se compara por contenido.
      const restored = query && query.state.dataUpdatedAt === effectiveUpdatedAt(row)
      const ref = restored ? query.state.data : undefined
      if (vjson && restored) {
        try {
          validators.set(row.queryHash, JSON.parse(vjson) as RecordedRequest[])
          validatorsRef.set(row.queryHash, ref)
        } catch {
          // Validadores ilegibles: la query se baja completa la próxima vez.
        }
      }
      persisted.set(row.queryHash, { ref, sig: hashString(json), vsig: vjson ? hashString(vjson) : "" })
    }
  }
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
  resetWriteState()
  activeUser = userSub
  if (previous != null) {
    queryClient.removeQueries({
      predicate: (query) =>
        !keep.some((key) => JSON.stringify(key) === JSON.stringify(query.queryKey)),
    })
  }
  if (deviceMode !== "personal" || !isIndexedDbAvailable()) return
  try {
    await loadVault(userSub)
    await setMeta(LAST_USER_KEY, userSub)
    await restoreUserQueries(queryClient, userSub)
  } catch (error) {
    console.warn("[offline] no se pudo restaurar el cache", error)
  }
}

/** Deja de persistir (sin borrar nada). */
export function deactivatePersistUser() {
  cancelPendingWrites()
  resetWriteState()
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
  await deleteMeta(verifiedMetaKey(userSub)).catch(() => undefined)
  if ((await getMeta<string>(LAST_USER_KEY)) === userSub) await deleteMeta(LAST_USER_KEY)
}

/** Solo para tests. */
export function __resetPersisterForTests() {
  unsubscribe?.()
  cancelPendingWrites()
  activeUser = null
  resetWriteState()
  resetPersistStats()
  deviceMode = DEFAULT_DEVICE_MODE
  initPromise = null
}

/**
 * Al crear el PIN, vuelve a escribir cifrado todo lo que estaba en claro
 * (queries del usuario). La outbox se re-sella aparte (`resealOutbox`).
 */
export async function resealUserQueries(userSub: string): Promise<void> {
  if (!isIndexedDbAvailable() || isVaultLocked()) return
  const db = await getDb()
  const rows = await db.getAllFromIndex("queries", "byUser", userSub)
  const sealed = await Promise.all(
    rows
      .filter((row) => !isEncrypted(row.data))
      .map(async (row) => ({
        ...row,
        data: await sealString(row.data),
        ...(row.validators && !isEncrypted(row.validators) && { validators: await sealString(row.validators) }),
      })),
  )
  if (sealed.length === 0) return
  const tx = db.transaction("queries", "readwrite")
  await Promise.all([...sealed.map((row) => tx.store.put(row)), tx.done])
}

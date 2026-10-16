/**
 * Base IndexedDB `ce-offline` (D2/§5 de `docs/offline/PLAN-offline.md`).
 *
 * v1 tiene tres stores:
 * - `meta`: claves sueltas del equipo (`deviceMode`, `lastUserSub`). Nada
 *   personal más allá del `sub` del último usuario.
 * - `session`: una fila por `sub` con claims NO sensibles (nunca el token ni
 *   la cookie) + snapshot de menú y permisos para entrar sin conexión.
 * - `queries`: una fila por query persistida, con clave `[userSub, queryHash]`
 *   para que un usuario nunca lea filas de otro.
 *
 * v2 (Fase 2, escrituras) agrega `outbox` (operaciones pendientes), `blobs`
 * (copias de los archivos adjuntos a una op) y `log` (ring buffer de 500
 * eventos de sincronización). Los tipos completos de sus filas viven en
 * `lib/offline/outbox/types.ts`; acá solo la forma mínima del esquema.
 *
 * Las migraciones van por versión en `upgrade`: al agregar stores (outbox,
 * blobs…) se sube `DB_VERSION` y se agrega un `if (oldVersion < N)`.
 *
 * Sin dependencias de features (task 7.1): los tipos de menú y permisos son
 * `unknown` acá; los interpreta quien los lee.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb"

export const DB_NAME = "ce-offline"
export const DB_VERSION = 2

export type DeviceMode = "compartido" | "personal"

export interface PersistedSession {
  sub: string
  name: string
  roles: string[]
  isSuperAdmin: boolean
  /** Datos de `["navigation","menu"]` (forma serializable, sin componentes). */
  menuSnapshot: unknown
  /** Datos de `["navigation","permisos-menu"]`. */
  permisos: unknown
  /** Cuándo se guardaron menú y permisos (TTL 30 días). */
  menuSavedAt: number | null
  savedAt: number
  /** Último refresh correcto contra el servidor (límite de 14 días, §0.2). */
  lastOnlineAuthAt: number
}

export interface PersistedQueryRow {
  userSub: string
  queryHash: string
  queryKey: unknown[]
  /** `${userSub}:${SCHEMA_VERSION}`: si no coincide al restaurar, se descarta. */
  buster: string
  /** JSON de la data (ya pasada por `persistSelect`). */
  data: string
  dataUpdatedAt: number
  /** Cuándo se escribió la fila (orden del LRU). */
  updatedAt: number
  ttl: number
  /** Bytes aproximados de `data` (UTF-8). */
  size: number
}

export interface OutboxRowShape {
  id: string
  userSub: string
  seq: number
  status: string
  entityKey: string
}

export interface BlobRowShape {
  id: string
  userSub: string
  opId: string
  /** Clave con la que el payload referencia el archivo. */
  fileKey: string
  name: string
  type: string
  size: number
  blob: Blob
  /** `pk_tarchivo` devuelto al subirlo: un reintento no lo vuelve a subir. */
  uploadedArchivoId?: number
}

export interface LogRowShape {
  id?: number
  at: number
  userSub: string
  level: "info" | "warn" | "error"
  event: string
  opId?: string
  data?: unknown
}

interface CeOfflineSchema extends DBSchema {
  meta: { key: string; value: unknown }
  outbox: {
    key: string
    value: OutboxRowShape
    indexes: { byUser: string }
  }
  blobs: {
    key: string
    value: BlobRowShape
    indexes: { byUser: string; byOp: string }
  }
  log: {
    key: number
    value: LogRowShape
    indexes: { byUser: string }
  }
  session: { key: string; value: PersistedSession }
  queries: {
    key: [string, string]
    value: PersistedQueryRow
    indexes: { byUser: string }
  }
}

export type CeOfflineDB = IDBPDatabase<CeOfflineSchema>

let dbPromise: Promise<CeOfflineDB> | null = null

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined"
}

export function getDb(): Promise<CeOfflineDB> {
  if (!dbPromise) {
    dbPromise = openDB<CeOfflineSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("meta")
          db.createObjectStore("session", { keyPath: "sub" })
          const queries = db.createObjectStore("queries", { keyPath: ["userSub", "queryHash"] })
          queries.createIndex("byUser", "userSub")
        }
        if (oldVersion < 2) {
          const outbox = db.createObjectStore("outbox", { keyPath: "id" })
          outbox.createIndex("byUser", "userSub")
          const blobs = db.createObjectStore("blobs", { keyPath: "id" })
          blobs.createIndex("byUser", "userSub")
          blobs.createIndex("byOp", "opId")
          const log = db.createObjectStore("log", { keyPath: "id", autoIncrement: true })
          log.createIndex("byUser", "userSub")
        }
      },
      // Otra pestaña con una versión nueva pide subir la base: se cierra esta
      // conexión para no bloquearla; la próxima llamada vuelve a abrir.
      blocking() {
        void dbPromise?.then((db) => db.close())
        dbPromise = null
      },
    })
    dbPromise.catch(() => {
      dbPromise = null
    })
  }
  return dbPromise
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await (await getDb()).get("meta", key)) as T | undefined
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await (await getDb()).put("meta", value, key)
}

export async function deleteMeta(key: string): Promise<void> {
  await (await getDb()).delete("meta", key)
}

/** Solo para tests: cierra la conexión para poder borrar la base. */
export async function __closeDbForTests(): Promise<void> {
  const current = dbPromise
  dbPromise = null
  if (current) (await current).close()
}

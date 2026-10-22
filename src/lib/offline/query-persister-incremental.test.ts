import "fake-indexeddb/auto"

import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { __closeDbForTests, DB_NAME, getDb, getMeta } from "@/lib/offline/db"
import {
  __resetPersisterForTests,
  activatePersistUser,
  deactivatePersistUser,
  flushPersistQueue,
  getPersistStats,
  getQueryValidators,
  getVerifiedAt,
  OFFLINE_TTL,
  resetPersistStats,
  setDeviceMode,
  setQueryValidators,
  startQueryPersister,
} from "@/lib/offline/query-persister"

// Persister incremental (`add-offline-preparar-incremental`): una query que
// vuelve a terminar con el MISMO dato no se cifra ni se reescribe; solo se
// anota "verificado a las…". Solo se escribe lo que cambió.

const A = "a@example.com"
const meta = { offline: { ttl: OFFLINE_TTL.roster } }

async function resetDb() {
  __resetPersisterForTests()
  await __closeDbForTests()
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
}

function newClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  startQueryPersister(client)
  return client
}

async function refetch(client: QueryClient, key: unknown[], data: unknown) {
  await client.fetchQuery({ queryKey: key, queryFn: () => structuredClone(data), meta: meta as never, staleTime: 0 })
  await flushPersistQueue()
}

beforeEach(async () => {
  await resetDb()
  await setDeviceMode("personal")
})

describe("persister: solo escribe lo que cambió", () => {
  it("una respuesta igual no escribe la fila; una distinta sí", async () => {
    const client = newClient()
    await activatePersistUser(client, A)
    const put = vi.spyOn(IDBObjectStore.prototype, "put")

    await refetch(client, ["planeador", "x"], { filas: [1, 2, 3] })
    expect(getPersistStats()).toEqual({ written: 1, unchanged: 0 })
    const primera = (await (await getDb()).getAllFromIndex("queries", "byUser", A))[0]

    put.mockClear()
    resetPersistStats()
    // Mismo contenido (otro objeto): TanStack conserva la referencia y el
    // persister no serializa, no cifra y no escribe la fila.
    await refetch(client, ["planeador", "x"], { filas: [1, 2, 3] })
    expect(getPersistStats()).toEqual({ written: 0, unchanged: 1 })
    const queriesPuts = put.mock.calls.filter((call) => (call[0] as { queryHash?: string })?.queryHash)
    expect(queriesPuts).toHaveLength(0)
    const segunda = (await (await getDb()).getAllFromIndex("queries", "byUser", A))[0]
    expect(segunda.updatedAt).toBe(primera.updatedAt)
    // Pero queda "verificado" (indicador de antigüedad), en `meta`.
    const hash = client.getQueryCache().find({ queryKey: ["planeador", "x"] })!.queryHash
    expect(getVerifiedAt(hash)).toBeGreaterThanOrEqual(primera.dataUpdatedAt)
    expect(await getMeta<Record<string, number>>(`verified:${A}`)).toHaveProperty(hash)

    resetPersistStats()
    await refetch(client, ["planeador", "x"], { filas: [1, 2, 3, 4] })
    expect(getPersistStats()).toEqual({ written: 1, unchanged: 0 })
    put.mockRestore()
  })

  it("solo escribe las queries del lote que cambiaron (dirty set)", async () => {
    const client = newClient()
    await activatePersistUser(client, A)
    for (const i of [1, 2, 3]) await refetch(client, ["planeador", i], { i })
    resetPersistStats()
    await client.fetchQuery({ queryKey: ["planeador", 1], queryFn: () => ({ i: 1 }), meta: meta as never, staleTime: 0 })
    await client.fetchQuery({ queryKey: ["planeador", 2], queryFn: () => ({ i: 22 }), meta: meta as never, staleTime: 0 })
    await client.fetchQuery({ queryKey: ["planeador", 3], queryFn: () => ({ i: 3 }), meta: meta as never, staleTime: 0 })
    await flushPersistQueue()
    expect(getPersistStats()).toEqual({ written: 1, unchanged: 2 })
  })

  it("tras restaurar, un dato igual al guardado no se reescribe y la fecha verificada se restaura", async () => {
    const client = newClient()
    await activatePersistUser(client, A)
    await refetch(client, ["planeador", "r"], { ok: 1 })
    await refetch(client, ["planeador", "r"], { ok: 1 })
    const hash = client.getQueryCache().find({ queryKey: ["planeador", "r"] })!.queryHash
    const verificado = getVerifiedAt(hash)!

    // Recarga: otro cliente, mismo usuario.
    deactivatePersistUser()
    const otro = newClient()
    await activatePersistUser(otro, A)
    expect(otro.getQueryState(["planeador", "r"])?.dataUpdatedAt).toBe(verificado)
    resetPersistStats()
    await refetch(otro, ["planeador", "r"], { ok: 1 })
    expect(getPersistStats()).toEqual({ written: 0, unchanged: 1 })
  })

  it("los validadores (ETag) se guardan con la fila y se restauran", async () => {
    const client = newClient()
    await activatePersistUser(client, A)
    await refetch(client, ["planeador", "v"], { ok: 1 })
    const query = client.getQueryCache().find({ queryKey: ["planeador", "v"] })!
    const validators = [{ method: "POST", url: "/api/eval-col/x/query", data: '{"A":1}', etag: '"abc"' }]
    // La fila ya estaba escrita sin validadores: se vuelve a encolar.
    setQueryValidators(query.queryHash, validators, query)
    resetPersistStats()
    await flushPersistQueue()
    expect(getPersistStats().written).toBe(1)

    deactivatePersistUser()
    const otro = newClient()
    await activatePersistUser(otro, A)
    const restaurado = otro.getQueryData(["planeador", "v"])
    expect(getQueryValidators(query.queryHash, restaurado)).toEqual(validators)
    // Si el dato en memoria cambia por otro camino, esos validadores ya no lo describen.
    otro.setQueryData(["planeador", "v"], { ok: 2 })
    expect(getQueryValidators(query.queryHash, otro.getQueryData(["planeador", "v"]))).toBeUndefined()
  })
})

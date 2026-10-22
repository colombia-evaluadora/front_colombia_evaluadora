import "fake-indexeddb/auto"

import { hashKey, QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { PrepareContext } from "@/features/offline/lib/prepare-engine"
import { PREPARE_FRESH_MS } from "@/features/offline/lib/prepare-freshness"
import { decidePrepare, prepareQuery } from "@/features/offline/lib/prepare-query"
import { __resetPersisterForTests, setQueryValidators } from "@/lib/offline/query-persister"
import { TTL_OFFLINE } from "@/lib/offline/query-meta"

const probe = vi.hoisted(() => vi.fn())
vi.mock("@/lib/offline/conditional-requests", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/offline/conditional-requests")>()),
  probeValidators: probe,
}))

const grupo = { offline: { ttl: TTL_OFFLINE.grupo } }
const catalogo = { offline: { ttl: TTL_OFFLINE.catalogo } }
const validator = [{ method: "GET", url: "/api/eval-col/x", etag: '"1"' }]

function ctx(extra: Partial<PrepareContext> = {}): PrepareContext {
  return {
    stats: { archivoBytes: 0 },
    staleTime: 0,
    force: false,
    counters: { fresh: 0, notModified: 0, fetched: 0 },
    probes: new Map(),
    probesInFlight: 0,
    seen: new Set(),
    ...extra,
  }
}

function withValidators(client: QueryClient, key: unknown[]) {
  setQueryValidators(hashKey(key), validator, client.getQueryCache().find({ queryKey: key, exact: true }))
}

function clientWith(key: unknown[], data: unknown, updatedAt: number) {
  const client = new QueryClient()
  client.setQueryData(key, data, { updatedAt })
  return client
}

beforeEach(() => {
  __resetPersisterForTests()
  probe.mockReset()
})

describe("prepareQuery", () => {
  it("fresca (dentro de su ventana): no pide nada", async () => {
    const key = ["planeador", "unidades", {}]
    const client = clientWith(key, { rows: [1] }, Date.now() - 60_000)
    const fetch = vi.fn()
    const c = ctx()
    expect(await prepareQuery(client, c, { queryKey: key, meta: grupo, fetch })).toEqual({ rows: [1] })
    expect(fetch).not.toHaveBeenCalled()
    expect(probe).not.toHaveBeenCalled()
    expect(c.counters).toEqual({ fresh: 1, notModified: 0, fetched: 0 })
  })

  it("planilla y asistencia se revisan siempre; 304 → no se baja y queda verificada", async () => {
    const key = ["planeador", "planilla", "columnas", { grupoId: 1 }]
    const antes = Date.now() - 60_000
    const client = clientWith(key, { cols: [1] }, antes)
    withValidators(client, key)
    probe.mockResolvedValue("unchanged")
    const fetch = vi.fn()
    const c = ctx()
    const data = client.getQueryData(key)
    expect(await prepareQuery(client, c, { queryKey: key, meta: grupo, fetch })).toBe(data)
    expect(fetch).not.toHaveBeenCalled()
    expect(probe).toHaveBeenCalledWith(validator)
    expect(client.getQueryState(key)!.dataUpdatedAt).toBeGreaterThan(antes)
    expect(c.counters.notModified).toBe(1)
  })

  it("si el sondeo dice que cambió, se baja con la queryFn", async () => {
    const key = ["asistencia", "calendario", { SEDE: 1 }]
    const client = clientWith(key, [1], Date.now())
    withValidators(client, key)
    probe.mockResolvedValue("changed")
    const fetch = vi.fn(async () => [1, 2])
    const c = ctx()
    expect(await prepareQuery(client, c, { queryKey: key, meta: grupo, fetch })).toEqual([1, 2])
    expect(fetch).toHaveBeenCalledOnce()
    expect(c.counters.fetched).toBe(1)
  })

  it("'Forzar todo' ignora ventanas y sondeos", async () => {
    const key = ["catalogo"]
    const client = clientWith(key, [1], Date.now())
    withValidators(client, key)
    const fetch = vi.fn(async () => [1])
    await prepareQuery(client, ctx({ force: true }), { queryKey: key, meta: catalogo, fetch })
    expect(fetch).toHaveBeenCalledOnce()
    expect(probe).not.toHaveBeenCalled()
  })

  it("decide por clase de dato: catálogo 1 día, grupo 4 h, sin validadores se baja", () => {
    const now = Date.now()
    const key = ["planeador", "periodos-evaluacion"]
    const client = clientWith(key, [1], now - PREPARE_FRESH_MS.grupo - 1)
    expect(decidePrepare(client, ctx(), key, catalogo, now)).toBe("fresh")
    expect(decidePrepare(client, ctx(), key, grupo, now)).toBe("fetch")
    withValidators(client, key)
    expect(decidePrepare(client, ctx(), key, grupo, now)).toBe("probe")
    // Si el dato en memoria cambió por otro camino, los validadores no valen.
    client.setQueryData(key, [2], { updatedAt: now - PREPARE_FRESH_MS.grupo - 1 })
    expect(decidePrepare(client, ctx(), key, grupo, now)).toBe("fetch")
    // Invalidada por una escritura: ni fresca ni sondeo, se baja.
    withValidators(client, key)
    void client.invalidateQueries({ queryKey: key, refetchType: "none" })
    expect(decidePrepare(client, ctx(), key, catalogo, now)).toBe("fetch")
  })
})

import "fake-indexeddb/auto"

import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/offline/offline-mode", () => ({ getOfflineMode: () => "full" }))
vi.mock("@/lib/offline/query-persister", () => ({ getDeviceMode: () => "personal" }))
const session = { lastOnlineAuthAt: Date.now() }
vi.mock("@/lib/offline/session", () => ({ getPersistedSession: async () => session }))

import { __closeDbForTests, DB_NAME } from "@/lib/offline/db"
import { __resetConnectivityForTests } from "@/lib/offline/connectivity"
import {
  __resetEngineForTests,
  configureOutbox,
  discardOp,
  enqueue,
  OutboxRejectedError,
  resolveKeepMine,
  runOrQueue,
  syncNow,
} from "@/lib/offline/outbox/engine"
import { OUTBOX_WINDOW_MS } from "@/lib/offline/outbox/policy"
import { registerOutboxHandler } from "@/lib/offline/outbox/registry"
import { __resetOutboxStoreForTests, outboxStore, setOutboxUser } from "@/lib/offline/outbox/store"
import type { SendCtx } from "@/lib/offline/outbox/types"

interface Celda {
  pk: number
  valor: number
  baseVersion?: string | null
}

const SOLICITUD_NOTE = "El periodo se cerró antes de sincronizar: tus cambios quedaron como solicitud al coordinador."

const send = vi.fn<(p: Celda, ctx: SendCtx) => Promise<unknown>>()

registerOutboxHandler<Celda>({
  kind: "test.celda",
  version: 1,
  entityKey: (p) => `celda:${p.pk}`,
  coalesce: (prev, next) => ({ ...next, baseVersion: prev.baseVersion ?? next.baseVersion }),
  send: (p, ctx) => send(p, ctx),
  invalidates: () => [["test"]],
  rebase: (p, c) => ({ ...p, baseVersion: c.serverVersion ?? null }),
  noteOf: (r) => ((r as { solicitudes_pendientes?: number[] })?.solicitudes_pendientes?.length ? SOLICITUD_NOTE : null),
  describe: (p) => ({ titulo: `Celda ${p.pk}`, detalle: "" }),
})

function httpError(status: number, data: unknown = {}) {
  const response = { status, data, headers: {}, statusText: "", config: { headers: new AxiosHeaders() } } as AxiosResponse
  return new AxiosError("x", "ERR_BAD_RESPONSE", undefined, undefined, response)
}
const networkError = () => new AxiosError("Network Error", "ERR_NETWORK")

async function resetDb() {
  await __closeDbForTests()
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
}

beforeEach(async () => {
  vi.useRealTimers()
  send.mockReset()
  session.lastOnlineAuthAt = Date.now()
  __resetEngineForTests()
  __resetOutboxStoreForTests()
  await resetDb()
  __resetConnectivityForTests("online")
  configureOutbox({ ensureAuth: async () => "ok" })
  await setOutboxUser("docente@example.com")
})

afterEach(() => {
  __resetEngineForTests()
})

const ops = () => outboxStore.getOps()

describe("runOrQueue (online-first, D-F2-7)", () => {
  it("con red envía directo y no encola", async () => {
    send.mockResolvedValueOnce({ ok: true })
    const r = await runOrQueue("test.celda", { pk: 1, valor: 4 })
    expect(r).toEqual({ queued: false, result: { ok: true } })
    expect(ops()).toHaveLength(0)
  })

  it("si falla por red encola con la MISMA Idempotency-Key", async () => {
    send.mockRejectedValueOnce(networkError())
    const r = await runOrQueue("test.celda", { pk: 1, valor: 4 })
    expect(r.queued).toBe(true)
    const key = send.mock.calls[0][1].idempotencyKey
    expect(ops()[0].idempotencyKey).toBe(key)
  })

  it("un error de negocio se propaga (no se encola)", async () => {
    send.mockRejectedValueOnce(httpError(400, { message: "x" }))
    await expect(runOrQueue("test.celda", { pk: 1, valor: 4 })).rejects.toBeInstanceOf(AxiosError)
    expect(ops()).toHaveLength(0)
  })

  it("sin red encola directo", async () => {
    __resetConnectivityForTests("offline")
    const r = await runOrQueue("test.celda", { pk: 1, valor: 4 })
    expect(r.queued).toBe(true)
    expect(send).not.toHaveBeenCalled()
  })

  it("con pendientes de la misma entidad, lo nuevo va a la cola (FIFO)", async () => {
    __resetConnectivityForTests("offline")
    await runOrQueue("test.celda", { pk: 1, valor: 4 })
    __resetConnectivityForTests("online")
    send.mockRejectedValue(networkError())
    const r = await runOrQueue("test.celda", { pk: 1, valor: 5 })
    expect(r.queued).toBe(true)
  })
})

describe("enqueue", () => {
  beforeEach(() => __resetConnectivityForTests("offline"))

  it("fusiona dos ediciones de la misma celda conservando la versión base de la primera", async () => {
    await enqueue("test.celda", { pk: 1, valor: 3, baseVersion: "v1" })
    await enqueue("test.celda", { pk: 1, valor: 5, baseVersion: "v9" })
    expect(ops()).toHaveLength(1)
    expect(ops()[0].payload).toEqual({ pk: 1, valor: 5, baseVersion: "v1" })
  })

  it("rechaza visible pasados 14 días sin autenticarse", async () => {
    session.lastOnlineAuthAt = Date.now() - OUTBOX_WINDOW_MS - 1
    await expect(enqueue("test.celda", { pk: 2, valor: 1 })).rejects.toBeInstanceOf(OutboxRejectedError)
  })

  it("rechaza archivos de más de 10 MB", async () => {
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "a.pdf")
    await expect(enqueue("test.celda", { pk: 3, valor: 1 }, { files: { a: big } })).rejects.toThrow(/10 MB/)
  })
})

describe("syncNow", () => {
  async function encolarOffline(n: number) {
    __resetConnectivityForTests("offline")
    for (let i = 0; i < n; i++) await enqueue("test.celda", { pk: i, valor: i })
    __resetConnectivityForTests("online")
  }

  it("envía 40 celdas una sola vez cada una y deja todo done", async () => {
    await encolarOffline(40)
    send.mockResolvedValue({})
    await syncNow()
    expect(send).toHaveBeenCalledTimes(40)
    expect(new Set(send.mock.calls.map((c) => c[0].pk)).size).toBe(40)
    expect(outboxStore.getSummary().total).toBe(0)
  })

  it("respuesta perdida: el reintento reutiliza la Idempotency-Key", async () => {
    await encolarOffline(1)
    send.mockRejectedValueOnce(networkError())
    await syncNow()
    expect(ops()[0].status).toBe("retry")
    send.mockResolvedValueOnce({})
    await (await import("@/lib/offline/outbox/store")).patchOp(ops()[0].id, { nextAttemptAt: 0 })
    await syncNow()
    expect(send.mock.calls[0][1].idempotencyKey).toBe(send.mock.calls[1][1].idempotencyKey)
    expect(ops()[0].status).toBe("done")
  })

  it("409 OFFLINE_CONFLICT → conflict; 'Conservar el mío' reenvía con la versión del servidor", async () => {
    await encolarOffline(1)
    send.mockRejectedValueOnce(httpError(409, { code: "OFFLINE_CONFLICT", current: 9, serverVersion: "v2" }))
    await syncNow()
    expect(ops()[0].status).toBe("conflict")
    send.mockResolvedValueOnce({})
    await resolveKeepMine(ops()[0].id)
    await syncNow()
    expect(send.mock.calls[1][0].baseVersion).toBe("v2")
    expect(ops()[0].status).toBe("done")
  })

  it("periodo cerrado con solicitud (regla 55/75): done con la nota y el resumen la informa", async () => {
    await encolarOffline(1)
    const reports: { notes: string[] }[] = []
    configureOutbox({ ensureAuth: async () => "ok", onBatchEnd: (r) => reports.push(r) })
    send.mockResolvedValueOnce({ calificacion: null, solicitudes_pendientes: [9] })
    await syncNow()
    expect(ops()[0]).toMatchObject({ status: "done", resultNote: SOLICITUD_NOTE })
    expect(reports.at(-1)?.notes).toEqual([SOLICITUD_NOTE])
  })

  it("periodo cerrado → rejected visible (nada se pierde)", async () => {
    await encolarOffline(1)
    send.mockRejectedValueOnce(httpError(422, { code: "PERIODO_CERRADO", message: "El periodo está cerrado" }))
    await syncNow()
    expect(ops()[0]).toMatchObject({ status: "rejected", lastError: { code: "PERIODO_CERRADO" } })
    expect(outboxStore.getSummary().rejected).toBe(1)
  })

  it("refresh 401 antes de enviar: pausa y conserva la cola", async () => {
    await encolarOffline(2)
    configureOutbox({ ensureAuth: async () => "unauth" })
    await syncNow()
    expect(send).not.toHaveBeenCalled()
    expect(outboxStore.getSummary()).toMatchObject({ needsLogin: true, total: 2 })
  })

  it("descartar elimina la op", async () => {
    __resetConnectivityForTests("offline")
    await enqueue("test.celda", { pk: 7, valor: 1 })
    await discardOp(ops()[0].id)
    expect(ops()).toHaveLength(0)
  })

  it("persiste en IndexedDB: otra 'pestaña' (recarga) ve las ops", async () => {
    await encolarOffline(3)
    __resetOutboxStoreForTests()
    await setOutboxUser("docente@example.com")
    expect(ops()).toHaveLength(3)
    // Otro usuario nunca ve las ops del anterior.
    await setOutboxUser("otro@example.com")
    expect(ops()).toHaveLength(0)
  })
})

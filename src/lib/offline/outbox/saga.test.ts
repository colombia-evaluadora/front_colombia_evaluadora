import "fake-indexeddb/auto"

import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/offline/offline-mode", () => ({ getOfflineMode: () => "full" }))
vi.mock("@/lib/offline/query-persister", () => ({ getDeviceMode: () => "personal" }))
vi.mock("@/lib/offline/session", () => ({ getPersistedSession: async () => ({ lastOnlineAuthAt: Date.now() }) }))

import { __closeDbForTests, DB_NAME } from "@/lib/offline/db"
import { __resetConnectivityForTests } from "@/lib/offline/connectivity"
import { __resetEngineForTests, configureOutbox, syncNow } from "@/lib/offline/outbox/engine"
import { registerOutboxHandler } from "@/lib/offline/outbox/registry"
import {
  __resetSagaForTests,
  enqueueSaga,
  groupSagas,
  resolveId,
  retrySagaFrom,
  sagaStatus,
  setMappedId,
  skipSagaStep,
  type SagaPayload,
} from "@/lib/offline/outbox/saga"
import { __resetOutboxStoreForTests, outboxStore, reload, setOutboxUser } from "@/lib/offline/outbox/store"
import { assertNoTmpIds, containsTmpId, newTmpId, TmpIdLeakError, type TmpId } from "@/lib/offline/outbox/tmp-id"
import type { SendCtx } from "@/lib/offline/outbox/types"

/** Registro de requests "al servidor": [paso, id resuelto, Idempotency-Key]. */
const calls: { kind: string; id: number | null; key: string }[] = []
const fallar = new Map<string, () => Error>()
let nextPk = 100

function maybeFail(kind: string) {
  const error = fallar.get(kind)?.()
  if (error) throw error
}

interface Crear extends SagaPayload {
  tmpId: TmpId
}
interface Paso extends SagaPayload {
  actividadId: number | TmpId
}

registerOutboxHandler<Crear>({
  kind: "t.crear",
  version: 1,
  entityKey: (p) => `t:${p.saga.id}:${p.saga.step}`,
  async send(p, ctx: SendCtx) {
    maybeFail("t.crear")
    const id = nextPk++
    calls.push({ kind: "t.crear", id, key: ctx.idempotencyKey })
    await setMappedId(p.tmpId, id)
    return { id }
  },
  invalidates: () => [],
  describe: (p) => ({ titulo: p.saga.titulo, detalle: p.saga.label }),
})
for (const kind of ["t.materiales", "t.instrumento", "t.criterio"]) {
  registerOutboxHandler<Paso>({
    kind,
    version: 1,
    entityKey: (p) => `t:${p.saga.id}:${p.saga.step}`,
    async send(p, ctx: SendCtx) {
      const id = await resolveId(p.actividadId)
      maybeFail(kind)
      calls.push({ kind, id, key: ctx.idempotencyKey })
      return null
    },
    invalidates: () => [],
    describe: (p) => ({ titulo: p.saga.titulo, detalle: p.saga.label }),
  })
}

function httpError(status: number, message = "rechazado") {
  const response = { status, data: { message }, headers: {}, statusText: "", config: { headers: new AxiosHeaders() } } as AxiosResponse
  return new AxiosError("x", "ERR_BAD_RESPONSE", undefined, undefined, response)
}

async function resetDb() {
  await __closeDbForTests()
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
}

beforeEach(async () => {
  calls.length = 0
  fallar.clear()
  nextPk = 100
  __resetEngineForTests()
  __resetOutboxStoreForTests()
  __resetSagaForTests()
  await resetDb()
  __resetConnectivityForTests("online")
  configureOutbox({ ensureAuth: async () => "ok" })
  await setOutboxUser("docente@example.com")
})
afterEach(() => __resetEngineForTests())

function crearSaga(criterios = 2) {
  const tmpId = newTmpId()
  return enqueueSaga({
    target: `actividad:${tmpId}`,
    titulo: "Crear prueba",
    steps: [
      { kind: "t.crear", label: "Crear", payload: { tmpId } },
      { kind: "t.materiales", label: "Materiales", payload: { actividadId: tmpId } },
      { kind: "t.instrumento", label: "Instrumento", payload: { actividadId: tmpId } },
      ...Array.from({ length: criterios }, () => ({
        kind: "t.criterio",
        label: "Criterio",
        payload: { actividadId: tmpId },
        after: [0],
      })),
    ],
  })
}

/** Sincroniza hasta que no quede nada listo (el engine encadena lotes). */
async function sincronizar() {
  for (let i = 0; i < 5; i++) await syncNow()
}

describe("sagas de la outbox (Fase 3)", () => {
  it("envía los pasos en orden, remapea el tmp: al id real y usa una clave fija por paso", async () => {
    const { sagaId } = await crearSaga()
    await sincronizar()
    const orden = calls.map((c) => c.kind)
    expect(orden[0]).toBe("t.crear")
    expect(orden.indexOf("t.materiales")).toBeLessThan(orden.indexOf("t.instrumento"))
    expect(calls.filter((c) => c.kind === "t.criterio")).toHaveLength(2)
    expect(new Set(calls.map((c) => c.id))).toEqual(new Set([100]))
    for (const c of calls) expect(c.key.startsWith(`saga:${sagaId}:`)).toBe(true)
    expect(calls[0].key).toBe(`saga:${sagaId}:0`)
    expect(groupSagas(outboxStore.getOps())[0].status).toBe("done")
  })

  it("un paso rechazado bloquea a sus dependientes y deja la saga parcial", async () => {
    fallar.set("t.materiales", () => httpError(400, "archivo dañado"))
    await crearSaga(0)
    await sincronizar()
    const [saga] = groupSagas(outboxStore.getOps())
    expect(saga.status).toBe("partial")
    expect(saga.steps.map((o) => o.status)).toEqual(["done", "rejected", "blocked"])
    expect(saga.failedStep?.lastError?.message).toBe("archivo dañado")
  })

  it("'Omitir este paso' deja seguir a los siguientes", async () => {
    fallar.set("t.materiales", () => httpError(400))
    await crearSaga(0)
    await sincronizar()
    const fallido = groupSagas(outboxStore.getOps())[0].failedStep!
    await skipSagaStep(fallido.id)
    await sincronizar()
    expect(calls.map((c) => c.kind)).toEqual(["t.crear", "t.instrumento"])
    expect(groupSagas(outboxStore.getOps())[0].status).toBe("done")
  })

  it("'Reintentar desde aquí' reenvía solo desde el paso fallido", async () => {
    fallar.set("t.materiales", () => httpError(400))
    await crearSaga(0)
    await sincronizar()
    fallar.clear()
    await retrySagaFrom(groupSagas(outboxStore.getOps())[0].failedStep!.id)
    await sincronizar()
    expect(calls.map((c) => c.kind)).toEqual(["t.crear", "t.materiales", "t.instrumento"])
  })

  it("un criterio rechazado no frena a los demás (hermanos)", async () => {
    let n = 0
    fallar.set("t.criterio", () => (n++ === 0 ? httpError(400, "criterio") : undefined) as Error)
    await crearSaga(2)
    await sincronizar()
    const pasos = groupSagas(outboxStore.getOps())[0].steps.map((o) => o.status)
    expect(pasos.filter((s) => s === "done")).toHaveLength(4)
    expect(pasos.filter((s) => s === "rejected")).toHaveLength(1)
  })

  it("tras recargar (reinicio del equipo) solo se envían los pasos faltantes", async () => {
    fallar.set("t.instrumento", () => new AxiosError("Network Error", "ERR_NETWORK"))
    await crearSaga(0)
    await syncNow()
    await syncNow()
    expect(calls.map((c) => c.kind)).toEqual(["t.crear", "t.materiales"])
    // "Reinicio": se pierde todo lo que vivía en memoria; queda IndexedDB.
    __resetEngineForTests()
    __resetSagaForTests()
    __resetOutboxStoreForTests()
    await setOutboxUser("docente@example.com")
    await reload()
    fallar.clear()
    const pendientes = outboxStore.getOps().filter((o) => o.status !== "done")
    for (const op of pendientes) op.nextAttemptAt = 0
    await sincronizar()
    expect(calls.map((c) => c.kind)).toEqual(["t.crear", "t.materiales", "t.instrumento"])
    expect(calls[2].id).toBe(100)
  })

  it("una segunda saga sobre la misma entidad espera a la anterior", async () => {
    const target = "actividad:7"
    fallar.set("t.materiales", () => httpError(400))
    const a = await enqueueSaga({ target, titulo: "A", steps: [{ kind: "t.materiales", label: "M", payload: { actividadId: 7 } }] })
    const b = await enqueueSaga({ target, titulo: "B", steps: [{ kind: "t.instrumento", label: "I", payload: { actividadId: 7 } }] })
    expect(b.ops[0].dependsOn).toEqual([a.ops[0].id])
    await sincronizar()
    expect(calls).toHaveLength(0)
    expect(outboxStore.getOps().find((o) => o.id === b.ops[0].id)?.status).toBe("blocked")
  })
})

describe("estado agregado", () => {
  it("prioriza conflicto, luego parcial", () => {
    expect(sagaStatus([{ status: "done" }, { status: "conflict" }])).toBe("conflict")
    expect(sagaStatus([{ status: "done" }, { status: "rejected" }])).toBe("partial")
    expect(sagaStatus([{ status: "rejected" }, { status: "blocked" }])).toBe("rejected")
    expect(sagaStatus([{ status: "pending" }])).toBe("pending")
    expect(sagaStatus([{ status: "done" }, { status: "done" }])).toBe("done")
  })
})

describe("guard de ids temporales", () => {
  it("detecta tmp:<uuid> en url y cuerpo, no un texto cualquiera", () => {
    const tmp = newTmpId()
    expect(containsTmpId(`/planeador/actividades/${tmp}/materiales`)).toBe(true)
    expect(containsTmpId({ FK_TUNIDAD: tmp })).toBe(true)
    expect(containsTmpId({ DESCRIPCION: "nota tmp: revisar" })).toBe(false)
    expect(() => assertNoTmpIds({ url: `/x/${tmp}` })).toThrow(TmpIdLeakError)
    expect(() => assertNoTmpIds({ url: "/x/12", data: { a: 1 } })).not.toThrow()
  })

  it("resolveId tira si el padre aún no tiene id real", async () => {
    await expect(resolveId(newTmpId())).rejects.toThrow()
    expect(await resolveId(5)).toBe(5)
  })
})

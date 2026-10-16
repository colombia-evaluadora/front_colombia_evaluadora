import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios"
import { describe, expect, it } from "vitest"

import {
  backoffDelay,
  classifyError,
  dependentsOf,
  MAX_SERVER_ATTEMPTS,
  OUTBOX_WARN_MS,
  OUTBOX_WINDOW_MS,
  outboxWindow,
  selectBlocked,
  selectReady,
  summarize,
} from "@/lib/offline/outbox/policy"
import type { OutboxOp } from "@/lib/offline/outbox/types"

function op(partial: Partial<OutboxOp>): OutboxOp {
  return {
    id: "x",
    seq: 1,
    userSub: "u",
    kind: "k",
    handlerVersion: 1,
    entityKey: "e",
    dependsOn: [],
    payload: {},
    blobRefs: [],
    idempotencyKey: "key",
    status: "pending",
    attempts: 0,
    nextAttemptAt: 0,
    lastError: null,
    conflict: null,
    resultNote: null,
    createdAt: 0,
    updatedAt: 0,
    appBuild: "",
    ...partial,
  }
}

function httpError(status: number, data: unknown = {}, headers: Record<string, string> = {}) {
  const response = { status, data, headers, statusText: "", config: { headers: new AxiosHeaders() } } as AxiosResponse
  return new AxiosError("x", "ERR_BAD_RESPONSE", undefined, undefined, response)
}

describe("backoffDelay", () => {
  it("duplica desde 2 s y se topa en 5 min, con jitter ±20 %", () => {
    expect(backoffDelay(0, () => 0.5)).toBe(2_000)
    expect(backoffDelay(3, () => 0.5)).toBe(16_000)
    expect(backoffDelay(20, () => 0.5)).toBe(300_000)
    expect(backoffDelay(1, () => 0)).toBe(3_200)
    expect(backoffDelay(1, () => 1)).toBe(4_800)
  })
})

describe("classifyError", () => {
  it("red y 503 → retry sin límite", () => {
    expect(classifyError(new AxiosError("Network Error", "ERR_NETWORK"), 50).kind).toBe("retry")
    expect(classifyError(httpError(503), 50).kind).toBe("retry")
  })

  it("401 → auth; 403 → rejected", () => {
    expect(classifyError(httpError(401), 0).kind).toBe("auth")
    expect(classifyError(httpError(403), 0).kind).toBe("rejected")
  })

  it("409 OFFLINE_CONFLICT → conflict con el valor del servidor", () => {
    const c = classifyError(
      httpError(409, { code: "OFFLINE_CONFLICT", current: { nota: 4 }, serverVersion: "2026-10-01T10:00:00Z" }),
      0,
    )
    expect(c.kind).toBe("conflict")
    expect(c.conflict).toEqual({ server: { nota: 4 }, serverVersion: "2026-10-01T10:00:00Z", rows: undefined })
  })

  it("el código también se reconoce en el mensaje del RAISE", () => {
    const c = classifyError(httpError(409, { message: "Conflict: ERROR: OFFLINE_CONFLICT: la celda cambió" }), 0)
    expect(c.kind).toBe("conflict")
  })

  it("409 de contexto (CK_TASISTENCIA_CONTEXTO) → rejected, no conflict", () => {
    const c = classifyError(httpError(409, { message: "Conflict: ERROR: CK_TASISTENCIA_CONTEXTO" }), 0)
    expect(c.kind).toBe("rejected")
  })

  it("422 PERIODO_CERRADO → rejected con el motivo del servidor", () => {
    const c = classifyError(httpError(422, { code: "PERIODO_CERRADO", message: "PERIODO_CERRADO: El periodo 2 está cerrado" }), 0)
    expect(c.kind).toBe("rejected")
    expect(c.error.code).toBe("PERIODO_CERRADO")
    expect(c.error.message).toBe("El periodo 2 está cerrado")
  })

  it("Idempotency-Key reusada con otro body → fatal", () => {
    expect(classifyError(httpError(422, { code: "IDEMPOTENCY_KEY_REUSED" }), 0).kind).toBe("fatal")
  })

  it("409 IDEMPOTENCY_IN_PROGRESS (gateway, BE-1) → retry con Retry-After", () => {
    const c = classifyError(httpError(409, { code: "IDEMPOTENCY_IN_PROGRESS" }, { "retry-after": "2" }), 0)
    expect(c).toMatchObject({ kind: "retry", retryAfterMs: 2_000 })
  })

  it("500 reintenta hasta 8 veces y luego rechaza", () => {
    expect(classifyError(httpError(500), MAX_SERVER_ATTEMPTS - 2).kind).toBe("retry")
    expect(classifyError(httpError(500), MAX_SERVER_ATTEMPTS - 1).kind).toBe("rejected")
  })

  it("429 respeta Retry-After", () => {
    const c = classifyError(httpError(429, {}, { "retry-after": "7" }), 0)
    expect(c).toMatchObject({ kind: "retry", retryAfterMs: 7_000 })
  })
})

describe("selectReady", () => {
  it("FIFO por entidad: solo la cabeza de cada entityKey", () => {
    const ops = [
      op({ id: "a", seq: 1, entityKey: "c1" }),
      op({ id: "b", seq: 2, entityKey: "c1" }),
      op({ id: "c", seq: 3, entityKey: "c2" }),
    ]
    expect(selectReady(ops, 0).map((o) => o.id)).toEqual(["a", "c"])
  })

  it("una op en conflicto bloquea las siguientes de su entidad", () => {
    const ops = [op({ id: "a", seq: 1, status: "conflict" }), op({ id: "b", seq: 2 })]
    expect(selectReady(ops, 0)).toEqual([])
  })

  it("respeta nextAttemptAt y dependsOn", () => {
    const ops = [
      op({ id: "a", seq: 1, entityKey: "x", status: "retry", nextAttemptAt: 100 }),
      op({ id: "b", seq: 2, entityKey: "y", dependsOn: ["a"] }),
    ]
    expect(selectReady(ops, 50)).toEqual([])
    expect(selectReady(ops, 100).map((o) => o.id)).toEqual(["a"])
  })

  it("dependientes de una rechazada quedan bloqueados, en cascada", () => {
    const ops = [
      op({ id: "a", entityKey: "x", status: "rejected" }),
      op({ id: "b", entityKey: "y", dependsOn: ["a"] }),
      op({ id: "c", entityKey: "z", dependsOn: ["b"] }),
    ]
    expect(selectBlocked(ops).map((o) => o.id)).toEqual(["b"])
    expect(dependentsOf(ops, "a").map((o) => o.id)).toEqual(["b", "c"])
  })
})

describe("summarize", () => {
  it("cuenta por estado y total abierto", () => {
    const s = summarize([
      op({ status: "pending" }),
      op({ status: "retry" }),
      op({ status: "conflict" }),
      op({ status: "rejected" }),
      op({ status: "done" }),
    ])
    expect(s).toMatchObject({ pending: 2, conflict: 1, rejected: 1, done: 1, total: 4 })
  })
})

describe("outboxWindow (14 días)", () => {
  const now = 1_000_000_000_000
  it("acepta hasta el día 14 y avisa desde el 12", () => {
    expect(outboxWindow(now - 1_000, now)).toMatchObject({ accepting: true, warn: false })
    expect(outboxWindow(now - OUTBOX_WARN_MS, now)).toMatchObject({ accepting: true, warn: true })
    expect(outboxWindow(now - OUTBOX_WINDOW_MS - 1, now)).toMatchObject({ accepting: false })
  })
})

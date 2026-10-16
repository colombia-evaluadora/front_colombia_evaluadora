import { describe, expect, it } from "vitest"

import { outboxHeaders } from "@/lib/offline/outbox/headers"

describe("outboxHeaders", () => {
  it("incluye el instante de captura cuando se conoce", () => {
    expect(outboxHeaders({ idempotencyKey: "k", capturedAt: Date.UTC(2026, 0, 2) })).toEqual({
      "Idempotency-Key": "k",
      "X-Client-Captured-At": "2026-01-02T00:00:00.000Z",
    })
  })
  it("sin captura solo manda la clave", () => {
    expect(outboxHeaders({ idempotencyKey: "k" })).toEqual({ "Idempotency-Key": "k" })
  })
})

import { describe, expect, it } from "vitest"

import { buildSyncReport } from "@/features/offline/lib/sync-report"
import type { OutboxOp } from "@/lib/offline/outbox/types"

const op = (id: string, status: OutboxOp["status"], message?: string) =>
  ({ id, kind: "k", createdAt: 1, status, lastError: message ? { code: "x", message } : null }) as OutboxOp

describe("buildSyncReport", () => {
  it("clasifica subidos, conflictos, rechazados y pendientes", () => {
    const report = buildSyncReport(
      ["a", "b", "c", "d", "e"],
      [op("b", "done"), op("c", "conflict"), op("d", "rejected", "Periodo cerrado"), op("e", "retry")],
    )
    expect(report.subidos).toBe(2)
    expect(report.conflictos.map((i) => i.id)).toEqual(["c"])
    expect(report.rechazados[0]).toMatchObject({ id: "d", motivo: "Periodo cerrado" })
    expect(report.pendientes).toBe(1)
  })
})

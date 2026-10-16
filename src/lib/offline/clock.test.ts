import { afterEach, describe, expect, it } from "vitest"

import { __resetClockForTests, getClockSkewMs, noteServerTime, serverNow } from "@/lib/offline/clock"

afterEach(() => __resetClockForTests())

describe("clock (X-Server-Time, BE-7)", () => {
  it("calcula el desfase respecto del servidor", () => {
    noteServerTime("2026-10-15T12:10:00Z", Date.parse("2026-10-15T12:00:00Z"))
    expect(getClockSkewMs()).toBe(10 * 60_000)
    expect(serverNow() - Date.now()).toBeGreaterThanOrEqual(10 * 60_000 - 50)
  })

  it("ignora cabeceras ausentes o inválidas", () => {
    noteServerTime(undefined)
    noteServerTime("no-es-fecha")
    expect(getClockSkewMs()).toBe(0)
  })
})

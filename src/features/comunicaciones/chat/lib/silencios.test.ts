import { describe, expect, it } from "vitest"

import {
  SILENCIOS,
  describirSilencio,
  subtituloSilencio,
} from "@/features/comunicaciones/chat/lib/silencios"

// 2026-10-23 17:13 hora Colombia
const AHORA = new Date("2026-10-23T22:13:00Z")

describe("silencios", () => {
  it("ofrece 8 horas, 1 semana y siempre", () => {
    expect(SILENCIOS.map((s) => s.valor)).toEqual(["8H", "1S", "SIEMPRE"])
  })

  it("describe el fin en relativo (hora Colombia)", () => {
    expect(subtituloSilencio("2026-10-23T23:00:00Z", AHORA)).toMatch(/^Silenciadas hasta hoy a la\(s\) 6:00/)
    expect(subtituloSilencio("2026-10-24T06:13:00Z", AHORA)).toMatch(/^Silenciadas hasta mañana a la\(s\) 1:13/)
    expect(subtituloSilencio("2026-10-30T22:13:00Z", AHORA)).toMatch(/^Silenciadas hasta el 30 de octubre a la\(s\)/)
    expect(subtituloSilencio("9999-12-31T00:00:00Z", AHORA)).toBe("Silenciadas siempre")
  })

  it("describe el estado en el panel", () => {
    expect(describirSilencio(null)).toBe("Notificaciones activas")
    expect(describirSilencio("9999-12-31T00:00:00Z")).toBe("Silenciada siempre")
  })
})

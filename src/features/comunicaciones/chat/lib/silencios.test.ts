import { describe, expect, it } from "vitest"

import { SILENCIOS, describirSilencio } from "@/features/comunicaciones/chat/lib/silencios"

describe("silencios", () => {
  it("ofrece 1 hora, fin del día y hasta reactivar", () => {
    expect(SILENCIOS.map((s) => s.valor)).toEqual(["1H", "FIN_DIA", "SIEMPRE"])
  })

  it("describe el estado", () => {
    expect(describirSilencio(null)).toBe("Notificaciones activas")
    expect(describirSilencio("9999-12-31T00:00:00Z")).toBe("Silenciada hasta que la actives")
    expect(describirSilencio("2026-10-24T05:00:00Z")).toMatch(/^Silenciada hasta .*24/)
  })
})

import { describe, expect, it } from "vitest"

import { COMPROMISOS_MAX_VISIBLE, realizacionDe, resumenCompromisos } from "./intervenciones"

describe("resumenCompromisos", () => {
  it("queda vacío sin compromisos", () => {
    expect(resumenCompromisos(null)).toBe("")
    expect(resumenCompromisos("   ")).toBe("")
  })

  it("antepone el rótulo y no trunca un texto corto", () => {
    expect(resumenCompromisos("La abuela lo acompañará.")).toBe("Compromisos: La abuela lo acompañará.")
  })

  it("trunca con puntos suspensivos un texto largo", () => {
    const r = resumenCompromisos("a".repeat(COMPROMISOS_MAX_VISIBLE + 20))
    expect(r.endsWith("…")).toBe(true)
    expect(r).toHaveLength("Compromisos: ".length + COMPROMISOS_MAX_VISIBLE + 1)
  })
})

describe("realizacionDe", () => {
  it("distingue realizada, programada y sin fechas", () => {
    expect(realizacionDe({ fecha_realizacion: "2027-05-12", fecha_programada: null })).toBe("Realizada el 12/05/2027")
    expect(realizacionDe({ fecha_realizacion: null, fecha_programada: "2027-05-20" })).toBe("Programada para el 20/05/2027")
    expect(realizacionDe({ fecha_realizacion: null, fecha_programada: null })).toBe("—")
  })
})

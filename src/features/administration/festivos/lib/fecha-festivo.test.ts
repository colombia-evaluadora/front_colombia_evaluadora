import { describe, expect, it } from "vitest"

import { domingoPascua, fechaFestivo, toIso } from "@/features/administration/festivos/lib/fecha-festivo"

const fija = (mes: number, dia: number) =>
  ({ tipoFecha: "FIJA", mes, dia, diasPascua: null, trasladoLunes: false }) as const
const emiliani = (mes: number, dia: number) => ({ ...fija(mes, dia), tipoFecha: "LEY_EMILIANI" }) as const
const pascua = (diasPascua: number, trasladoLunes: boolean) =>
  ({ tipoFecha: "PASCUA", mes: null, dia: null, diasPascua, trasladoLunes }) as const

const iso = (fecha: Date | null) => (fecha ? toIso(fecha) : null)

describe("domingoPascua", () => {
  it("coincide con el calendario oficial", () => {
    expect(toIso(domingoPascua(2025))).toBe("2025-04-20")
    expect(toIso(domingoPascua(2026))).toBe("2026-04-05")
    expect(toIso(domingoPascua(2027))).toBe("2027-03-28")
  })
})

describe("fechaFestivo", () => {
  it("deja la fija en su día", () => {
    expect(iso(fechaFestivo(fija(12, 25), 2027))).toBe("2027-12-25")
  })

  it("corre la Ley Emiliani al lunes siguiente salvo que ya sea lunes", () => {
    expect(iso(fechaFestivo(emiliani(3, 19), 2027))).toBe("2027-03-22")
    expect(iso(fechaFestivo(emiliani(10, 12), 2027))).toBe("2027-10-18")
    expect(iso(fechaFestivo(emiliani(6, 29), 2026))).toBe("2026-06-29")
  })

  it("cuenta desde Pascua y traslada solo si se pide", () => {
    expect(iso(fechaFestivo(pascua(-3, false), 2027))).toBe("2027-03-25")
    expect(iso(fechaFestivo(pascua(39, true), 2026))).toBe("2026-05-18")
    expect(iso(fechaFestivo(pascua(60, true), 2026))).toBe("2026-06-08")
  })

  it("devuelve null si falta un dato o el día no existe", () => {
    expect(fechaFestivo(fija(4, 31), 2027)).toBeNull()
    expect(fechaFestivo({ ...fija(1, 1), dia: null }, 2027)).toBeNull()
    expect(fechaFestivo({ ...pascua(0, false), diasPascua: null }, 2027)).toBeNull()
  })
})

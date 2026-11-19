import { describe, expect, it } from "vitest"

import {
  errorFechaIngreso,
  formatBeneficiarios,
  formatConPorcentaje,
  formatPct,
  formatRangoFechas,
  validarCopia,
  validarEstrategia,
  validarFinalizar,
  validarRetiro,
  type ValoresEstrategia,
} from "@/features/gestion-estudiantil/prevencion/utils/formularios-estrategias"

const valido: ValoresEstrategia = {
  nombre: "Tutorías de nivelación",
  tipo: "1",
  periodo: "10",
  inicio: new Date(2026, 10, 1),
  fin: new Date(2026, 11, 15),
  responsable: "5",
  fuente: "",
  meta: "40",
  descripcion: "Tutorías semanales de Matemáticas y Lengua.",
  requisitos: "",
}
const periodo = { desde: "2026-01-20T00:00:00.000Z", hasta: "2027-01-03T00:00:00.000Z" }

describe("validarEstrategia", () => {
  it("acepta un formulario completo dentro del Período Académico", () => {
    expect(validarEstrategia(valido, periodo)).toEqual({})
  })

  it("marca lo obligatorio, el largo y la meta", () => {
    const e = validarEstrategia(
      { ...valido, nombre: "ab", tipo: "", periodo: "", responsable: "", descripcion: "corta", meta: "0" },
      periodo,
    )
    expect(Object.keys(e).sort()).toEqual(["descripcion", "meta", "nombre", "periodo", "responsable", "tipo"])
  })

  it("exige las fechas dentro del período y el fin posterior al inicio", () => {
    expect(validarEstrategia({ ...valido, inicio: new Date(2025, 0, 1) }, periodo).inicio).toMatch(/dentro del Período/)
    expect(validarEstrategia({ ...valido, fin: new Date(2026, 10, 1) }, periodo).fin).toMatch(/posterior/)
    expect(validarEstrategia({ ...valido, fin: new Date(2027, 5, 1) }, periodo).fin).toMatch(/dentro del Período/)
  })
})

describe("validarRetiro", () => {
  it("pide fecha posterior al ingreso y resultado de la salida", () => {
    const ok = validarRetiro({ salida: new Date(2026, 10, 20), resultado: "3", motivo: "" }, "2026-11-13")
    expect(ok).toEqual({})
    const mal = validarRetiro({ salida: new Date(2026, 10, 13), resultado: "", motivo: "x".repeat(301) }, "2026-11-13")
    expect(Object.keys(mal).sort()).toEqual(["motivo", "resultado", "salida"])
  })
})

describe("copiar, finalizar y fecha de ingreso", () => {
  it("copiar exige inicio y un fin posterior", () => {
    expect(validarCopia({ inicio: undefined, fin: undefined }).inicio).toBeDefined()
    expect(validarCopia({ inicio: new Date(2027, 1, 1), fin: new Date(2027, 0, 1) }).fin).toBeDefined()
    expect(validarCopia({ inicio: new Date(2027, 1, 1), fin: undefined })).toEqual({})
  })

  it("finalizar exige el resultado (hasta 3000)", () => {
    expect(validarFinalizar("").resultado).toBeDefined()
    expect(validarFinalizar("No se ejecutó")).toEqual({})
    expect(validarFinalizar("x".repeat(3001)).resultado).toBeDefined()
  })

  it("la fecha de ingreso cae dentro de las fechas de la estrategia", () => {
    const limites = { desde: "2026-11-01", hasta: "2026-12-15" }
    expect(errorFechaIngreso(new Date(2026, 10, 13), limites)).toBeUndefined()
    expect(errorFechaIngreso(new Date(2026, 9, 31), limites)).toMatch(/anterior/)
    expect(errorFechaIngreso(new Date(2026, 11, 16), limites)).toMatch(/posterior/)
    expect(errorFechaIngreso(undefined, limites)).toMatch(/obligatoria/)
  })
})

describe("formatos", () => {
  it("beneficiarios «N de meta», «— de meta» y solo N sin meta", () => {
    expect(formatBeneficiarios(412, 450)).toBe("412 de 450")
    expect(formatBeneficiarios(0, 30)).toBe("— de 30")
    expect(formatBeneficiarios(23, null)).toBe("23")
  })

  it("rango de fechas con y sin fin", () => {
    expect(formatRangoFechas("2027-02-01T00:00:00.000Z", "2027-11-30T00:00:00.000Z")).toBe("01/02/2027 a 30/11/2027")
    expect(formatRangoFechas("2027-02-01", null)).toBe("desde 01/02/2027")
  })

  it("porcentajes con coma decimal y «Sin datos»", () => {
    expect(formatConPorcentaje(412, 427)).toBe("412 (96,5 %)")
    expect(formatConPorcentaje(23, 23)).toBe("23 (100 %)")
    expect(formatPct(null)).toBe("Sin datos")
    expect(formatPct(88.25)).toBe("88,3 %")
  })
})

import { describe, expect, it } from "vitest"

import type { EvaluationPeriod } from "@/features/establishment/academic-period/api/types/evaluation-period"
import { esPeriodoCerrado, rangosDePeriodos } from "@/features/planeador/lib/periodo-cerrado"

const periodo = (estado: "1" | "2", endDate: string): EvaluationPeriod =>
  ({ id: 1, nombre: "P", startDate: "2026-09-12", endDate, estado }) as EvaluationPeriod

describe("esPeriodoCerrado", () => {
  const hoy = new Date(2026, 9, 1)
  it("NO Calificable con la fecha fin vencida está cerrado", () => {
    expect(esPeriodoCerrado(periodo("2", "2026-09-30"), hoy)).toBe(true)
  })
  it("NO Calificable que termina hoy sigue abierto", () => {
    expect(esPeriodoCerrado(periodo("2", "2026-10-01"), hoy)).toBe(false)
  })
  it("Calificable vencido sigue abierto", () => {
    expect(esPeriodoCerrado(periodo("1", "2026-09-30"), hoy)).toBe(false)
  })
})

describe("rangosDePeriodos", () => {
  it("convierte a fechas locales", () => {
    const [r] = rangosDePeriodos([periodo("2", "2026-09-30")])
    expect(r.from).toEqual(new Date(2026, 8, 12))
    expect(r.to).toEqual(new Date(2026, 8, 30))
  })
})

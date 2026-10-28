import { describe, expect, it } from "vitest"
import { coverageIssueMessage, getCoverageIssues } from "./rating-scale-coverage"

const range = { min: 0, max: 10 }
const scale = (nombre: string, notaMinima: number, notaMaxima: number) => ({ nombre, notaMinima, notaMaxima })

describe("getCoverageIssues", () => {
  it("una escala contigua con paso 0,1 no tiene huecos ni cruces", () => {
    const scales = [scale("Bajo", 0, 5.9), scale("Básico", 6, 7.9), scale("Alto", 8, 8.9), scale("Superior", 9, 10)]
    expect(getCoverageIssues(scales, range)).toEqual([])
  })

  it("reporta el hueco entre dos valoraciones y al final", () => {
    const issues = getCoverageIssues([scale("Bajo", 0, 5.9), scale("Alto", 8, 9)], range)
    expect(issues.map(coverageIssueMessage)).toEqual([
      "La escala no cubre las notas entre 6,0 y 7,9.",
      "La escala no cubre las notas entre 9,1 y 10,0.",
    ])
  })

  it("reporta el cruce entre dos valoraciones", () => {
    const issues = getCoverageIssues([scale("Bajo", 0, 6.5), scale("Básico", 6, 10)], range)
    expect(issues.map(coverageIssueMessage)).toEqual([
      "Las valoraciones Bajo y Básico se cruzan entre 6,0 y 6,5.",
    ])
  })

  it("sin valoraciones, todo el formato queda sin cubrir", () => {
    expect(getCoverageIssues([], range).map(coverageIssueMessage)).toEqual([
      "La escala no cubre las notas entre 0,0 y 10,0.",
    ])
  })
})

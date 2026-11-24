import { describe, expect, it } from "vitest"

import type { PlaneadorPeriodoEvaluacion } from "@/features/planeador/api/query/use-planeador-periodos-evaluacion-query"
import { periodosDelGrupo } from "@/features/planeador/lib/periodos-del-grupo"

function p(id: number, academico: number, startDate: string, endDate: string): PlaneadorPeriodoEvaluacion {
  return { id, nombre: `Periodo ${id}`, startDate, endDate, periodoAcademicoId: academico } as PlaneadorPeriodoEvaluacion
}

const lista = [
  p(1, 10, "2025-02-01", "2025-05-31"),
  p(2, 10, "2025-06-01", "2025-11-30"),
  p(3, 20, "2026-02-01", "2026-05-31"),
  p(4, 20, "2026-06-01", "2026-11-30"),
]

describe("periodosDelGrupo", () => {
  it("con periodo académico conocido deja solo los suyos", () => {
    expect(periodosDelGrupo(lista, 10, "2026-07-01").map((x) => x.id)).toEqual([1, 2])
  })

  it("sin periodo académico usa el vigente hoy", () => {
    expect(periodosDelGrupo(lista, undefined, "2026-07-01").map((x) => x.id)).toEqual([3, 4])
  })

  it("sin vigente usa el más reciente", () => {
    expect(periodosDelGrupo(lista, undefined, "2026-12-20").map((x) => x.id)).toEqual([3, 4])
  })

  it("quita repetidos por id", () => {
    expect(periodosDelGrupo([...lista, lista[2]], 20).map((x) => x.id)).toEqual([3, 4])
  })

  it("si el periodo académico pedido no tiene periodos cae a la heurística", () => {
    expect(periodosDelGrupo(lista, 99, "2025-03-01").map((x) => x.id)).toEqual([1, 2])
  })

  it("lista vacía", () => {
    expect(periodosDelGrupo([], undefined)).toEqual([])
  })
})

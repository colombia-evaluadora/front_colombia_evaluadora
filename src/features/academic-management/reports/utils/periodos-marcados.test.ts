import { describe, expect, it } from "vitest"

import {
  PERIODO_FINAL_ID,
  type FilaInforme,
  type ModoPeriodo,
} from "@/features/academic-management/reports/api/types"
import {
  marcaKey,
  resolverObjetivos,
  sinMarcasDe,
} from "@/features/academic-management/reports/utils/periodos-marcados"

function fila(matriculaId: number, periodoId: number, modoPeriodo: ModoPeriodo = "real"): FilaInforme {
  return { matriculaId, periodoId, modoPeriodo } as FilaInforme
}

// Dos estudiantes con P1 (10), P2 (20) y el Final a la vista.
const FILAS = [
  fila(1, 10),
  fila(1, 20),
  fila(1, PERIODO_FINAL_ID, "final"),
  fila(2, 10),
  fila(2, 20),
  fila(2, PERIODO_FINAL_ID, "final"),
]

describe("resolverObjetivos", () => {
  it("sin marcas y para guardar, toma todos los períodos reales a la vista", () => {
    const r = resolverObjetivos(FILAS, new Set([1]), new Set(), "todos")
    expect(r.objetivos).toEqual([
      { matriculaId: 1, periodoId: 10 },
      { matriculaId: 1, periodoId: 20 },
    ])
    expect(r.sinPeriodo).toEqual([])
  })

  it("sin marcas y con varios períodos, el boletín no sabe cuál: queda sin período", () => {
    const r = resolverObjetivos(FILAS, new Set([1, 2]), new Set(), "unico")
    expect(r.objetivos).toEqual([])
    expect(r.sinPeriodo).toEqual([1, 2])
  })

  it("con un solo período real a la vista, el boletín lo usa sin marcas (como antes)", () => {
    const filas = [fila(1, 10), fila(1, PERIODO_FINAL_ID, "final"), fila(2, 10)]
    const r = resolverObjetivos(filas, new Set([1, 2]), new Set(), "unico")
    expect(r.objetivos).toEqual([
      { matriculaId: 1, periodoId: 10 },
      { matriculaId: 2, periodoId: 10 },
    ])
    expect(r.sinPeriodo).toEqual([])
  })

  it("las marcas deciden por estudiante y pueden ser períodos distintos", () => {
    const marcas = new Set([marcaKey(1, 10), marcaKey(2, 20)])
    const r = resolverObjetivos(FILAS, new Set([1, 2]), marcas, "unico")
    expect(r.objetivos).toEqual([
      { matriculaId: 1, periodoId: 10 },
      { matriculaId: 2, periodoId: 20 },
    ])
    expect(r.sinPeriodo).toEqual([])
  })

  it("un estudiante marcado y otro no: el no marcado queda sin período en el boletín", () => {
    const r = resolverObjetivos(FILAS, new Set([1, 2]), new Set([marcaKey(1, 20)]), "unico")
    expect(r.objetivos).toEqual([{ matriculaId: 1, periodoId: 20 }])
    expect(r.sinPeriodo).toEqual([2])
  })

  it("ignora a los no seleccionados, el Final y las marcas de períodos que ya no se ven", () => {
    const marcas = new Set([marcaKey(1, PERIODO_FINAL_ID), marcaKey(1, 30), marcaKey(2, 10)])
    const r = resolverObjetivos(FILAS, new Set([1]), marcas, "todos")
    expect(r.objetivos).toEqual([
      { matriculaId: 1, periodoId: 10 },
      { matriculaId: 1, periodoId: 20 },
    ])
  })
})

describe("sinMarcasDe", () => {
  it("quita solo las marcas de ese estudiante", () => {
    const marcas = new Set([marcaKey(1, 10), marcaKey(12, 10), marcaKey(1, 20)])
    expect([...sinMarcasDe(marcas, 1)]).toEqual([marcaKey(12, 10)])
  })
})

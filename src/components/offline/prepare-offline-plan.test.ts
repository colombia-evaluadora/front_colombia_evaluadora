import { describe, expect, it } from "vitest"

import {
  buildPlanillaTargets,
  defaultPeriodos,
  fullYearSelection,
  isCheckpointUsable,
  prepareFreshness,
  uniqueAsignaturas,
} from "@/components/offline/prepare-offline-plan"

const grupos = [
  { grupoId: 1, gradoId: 10, nombre: "6A" },
  { grupoId: 2, gradoId: 10, nombre: "6B" },
  { grupoId: 3, gradoId: 11, nombre: "7A" },
]
const pares = [
  { gradoId: 10, asignaturaId: 100, nombre: "Matemáticas" },
  { gradoId: 11, asignaturaId: 100, nombre: "Matemáticas" },
  { gradoId: 10, asignaturaId: 200, nombre: "Español" },
]

describe("buildPlanillaTargets", () => {
  it("cruza grupo × asignatura del mismo grado × periodo elegidos", () => {
    const targets = buildPlanillaTargets(grupos, pares, {
      grupos: new Set([1, 3]),
      asignaturas: new Set([100]),
      periodos: new Set([7, 8]),
    })
    expect(targets).toEqual([
      { grupoId: 1, asignaturaId: 100, gradoId: 10, periodoId: 7 },
      { grupoId: 1, asignaturaId: 100, gradoId: 10, periodoId: 8 },
      { grupoId: 3, asignaturaId: 100, gradoId: 11, periodoId: 7 },
      { grupoId: 3, asignaturaId: 100, gradoId: 11, periodoId: 8 },
    ])
  })

  it("sin periodos o grupos elegidos no descarga planillas", () => {
    expect(buildPlanillaTargets(grupos, pares, { grupos: new Set([1]), asignaturas: new Set([100]), periodos: new Set() })).toEqual([])
  })
})

describe("uniqueAsignaturas", () => {
  it("una entrada por asignatura, ordenada", () => {
    expect(uniqueAsignaturas(pares).map((a) => a.asignaturaId)).toEqual([200, 100])
  })
})

describe("defaultPeriodos", () => {
  const periodos = [
    { id: 1, nombre: "P1", startDate: "2026-02-01", endDate: "2026-04-30" },
    { id: 2, nombre: "P2", startDate: "2026-05-01", endDate: "2026-07-31" },
  ]
  it("el vigente hoy", () => expect(defaultPeriodos(periodos, "2026-05-10")).toEqual([2]))
  it("en vacaciones, el último que empezó", () => expect(defaultPeriodos(periodos, "2026-10-15")).toEqual([2]))
  it("antes del año, el primero", () => expect(defaultPeriodos(periodos, "2026-01-10")).toEqual([1]))
})

describe("offline de meses: preparación", () => {
  const day = 864e5
  it("antigüedad de la última preparación", () => {
    const now = 100 * day
    expect(prepareFreshness(now - day, now)).toBe("fresca")
    expect(prepareFreshness(now - 10 * day, now)).toBe("envejeciendo")
    expect(prepareFreshness(now - 40 * day, now)).toBe("vieja")
  })
  it("punto de control vence a las 24 h", () => {
    expect(isCheckpointUsable({ startedAt: 0, done: [] }, day - 1)).toBe(true)
    expect(isCheckpointUsable({ startedAt: 0, done: [] }, day + 1)).toBe(false)
    expect(isCheckpointUsable(null)).toBe(false)
  })
  it("todo el año elige todo", () => {
    const sel = fullYearSelection(
      [{ grupoId: 1, gradoId: 1, nombre: "a" }],
      [{ gradoId: 1, asignaturaId: 2, nombre: "m" }],
      [
        { id: 3, nombre: "P1", startDate: "", endDate: "" },
        { id: 4, nombre: "P2", startDate: "", endDate: "" },
      ],
    )
    expect([...sel.periodos]).toEqual([3, 4])
  })
})

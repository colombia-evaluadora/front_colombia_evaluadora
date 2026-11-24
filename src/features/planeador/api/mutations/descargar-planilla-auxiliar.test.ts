import { describe, expect, it } from "vitest"

import { filtrosPlanillaAuxiliar, type PlanillaAuxiliarInput } from "@/features/planeador/api/mutations/descargar-planilla-auxiliar"

const base: PlanillaAuxiliarInput = {
  tipo: "ASISTENCIA",
  grupo: 601,
  asignatura: null,
  periodo: 4,
  contenido: "EN_BLANCO",
  columnas: 5,
  etiquetas: {},
}

describe("filtrosPlanillaAuxiliar", () => {
  it("Asistencia con «Todas» no manda ASIGNATURA (una hoja por [Área])", () => {
    expect(filtrosPlanillaAuxiliar(base)).toEqual({
      TIPO: "ASISTENCIA",
      GRUPO: 601,
      ASIGNATURA: undefined,
      PERIODO: 4,
      CONTENIDO: "EN_BLANCO",
    })
  })

  it("Asistencia con un [Área] y lo registrado", () => {
    expect(filtrosPlanillaAuxiliar({ ...base, asignatura: 11, contenido: "CON_REGISTRADO" })).toMatchObject({
      ASIGNATURA: 11,
      CONTENIDO: "CON_REGISTRADO",
    })
  })

  it("Listado solo manda grupo y columnas en blanco", () => {
    expect(filtrosPlanillaAuxiliar({ ...base, tipo: "LISTADO", columnas: 7 })).toEqual({
      TIPO: "LISTADO",
      GRUPO: 601,
      COLUMNAS: 7,
    })
  })
})

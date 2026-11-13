import { describe, expect, it } from "vitest"

import { INDICADORES_FILTROS_VACIOS } from "@/features/gestion-estudiantil/prevencion/api/types"
import {
  formatPorcentaje,
  textoRetiros,
  toIndicadoresFilters,
} from "@/features/gestion-estudiantil/prevencion/utils/indicadores"

describe("indicadores", () => {
  it("formatea porcentajes con coma y un decimal", () => {
    expect(formatPorcentaje(94.2)).toBe("94,2 %")
    expect(formatPorcentaje(100)).toBe("100 %")
    expect(formatPorcentaje(null)).toBe("—")
  })

  it("convierte los filtros vacíos a nulos, con Agrupar por Grado", () => {
    expect(toIndicadoresFilters(7, INDICADORES_FILTROS_VACIOS)).toEqual({
      ESTABLECIMIENTO: 7,
      PERIODO_ACADEMICO: null,
      PERIODO: null,
      SEDE: null,
      JORNADA: null,
      AGRUPAR: "GRADO",
      MOTIVO_RETIRO: null,
    })
  })

  it("junta retiros y motivo", () => {
    expect(textoRetiros(0, null)).toBe("—")
    expect(textoRetiros(2, "Situación económica")).toBe("2 (Situación económica)")
    expect(textoRetiros(3, null)).toBe("3")
  })
})

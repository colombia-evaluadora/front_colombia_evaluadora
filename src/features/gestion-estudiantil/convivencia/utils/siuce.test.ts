import { describe, expect, it } from "vitest"

import type { AfectadoSiuce } from "@/features/gestion-estudiantil/convivencia/api/types"
import {
  afectadosReportados,
  afectadosSinCodigo,
  erroresExportarSiuce,
  agruparColumnas,
  filtrarColumnas,
  rangoValido,
  textoReportado,
  todosQuedanReportados,
} from "@/features/gestion-estudiantil/convivencia/utils/siuce"

const ana: AfectadoSiuce = { fk_matricula: 7, fk_funcionario: null, nombre: "Ana", grado_grupo: "6A", codigo: "C1", fecha_reporte: "2026-10-28" }
const luis: AfectadoSiuce = { fk_matricula: 8, fk_funcionario: null, nombre: "Luis", grado_grupo: "6A", codigo: null, fecha_reporte: null }
const eva: AfectadoSiuce = { fk_matricula: null, fk_funcionario: 3, nombre: "Eva", grado_grupo: null, codigo: null, fecha_reporte: null }

describe("rangoValido", () => {
  it("exige ambas fechas y orden", () => {
    expect(rangoValido("2026-01-01", "2026-01-31")).toBe(true)
    expect(rangoValido("2026-01-01", "2026-01-01")).toBe(true)
    expect(rangoValido("2026-02-01", "2026-01-31")).toBe(false)
    expect(rangoValido("", "2026-01-31")).toBe(false)
  })
})

describe("columnas", () => {
  const cols = [
    { clave: "a", rotulo: "Acción realizada", grupo: "G1" },
    { clave: "b", rotulo: "Número de caso", grupo: "G2" },
    { clave: "c", rotulo: "Accion remitida", grupo: "G1" },
  ]
  it("busca sin tildes ni mayúsculas", () => {
    expect(filtrarColumnas(cols, "ACCION").map((c) => c.clave)).toEqual(["a", "c"])
    expect(filtrarColumnas(cols, " ")).toHaveLength(3)
  })
  it("agrupa en orden de aparición", () => {
    expect(agruparColumnas(cols).map((g) => [g.grupo, g.items.length])).toEqual([["G1", 2], ["G2", 1]])
  })
})

describe("afectados SIUCE", () => {
  it("separa con y sin código", () => {
    expect(afectadosSinCodigo([ana, luis, eva]).map((a) => a.nombre)).toEqual(["Luis", "Eva"])
    expect(afectadosReportados([ana, luis]).map((a) => a.nombre)).toEqual(["Ana"])
    expect(afectadosSinCodigo(null)).toEqual([])
  })
  it("texto del reporte", () => {
    expect(textoReportado(ana)).toBe("Ana se reportó el 28/10/2026 (código C1)")
  })
  it("todos quedan reportados cuando los elegidos cubren a los pendientes", () => {
    expect(todosQuedanReportados([ana, luis, eva], ["m:8"])).toBe(false)
    expect(todosQuedanReportados([ana, luis, eva], ["m:8", "f:3", ""])).toBe(true)
    expect(todosQuedanReportados([ana], [])).toBe(true)
    expect(todosQuedanReportados([], [])).toBe(false)
  })
})

describe("erroresExportarSiuce", () => {
  it("rango obligatorio y ordenado, al menos una columna", () => {
    expect(erroresExportarSiuce("", "", []).rango).toMatch(/obligatorio/)
    expect(erroresExportarSiuce("2026-02-01", "2026-01-01", ["a"]).rango).toMatch(/posterior/)
    expect(erroresExportarSiuce("2026-01-01", "2026-02-01", []).columnas).toBe("Elija al menos una columna.")
    expect(Object.values(erroresExportarSiuce("2026-01-01", "2026-02-01", ["a"])).some(Boolean)).toBe(false)
  })
})

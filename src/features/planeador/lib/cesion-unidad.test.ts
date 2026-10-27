import { describe, expect, it } from "vitest"

import { toUnidadColega, type UnidadColega } from "@/features/planeador/api/query/use-unidad-colegas-query"
import { describirUsoColega, resolverCesion } from "@/features/planeador/lib/cesion-unidad"

const colega = (funcionarioId: number | null, nombre: string, actividades = 1, criterios = 0): UnidadColega => ({
  funcionarioId,
  nombre,
  actividades,
  criterios,
})

describe("resolverCesion (Regla 27)", () => {
  it("sin colegas no hay a quién ceder", () => {
    expect(resolverCesion([])).toEqual({ modo: "sin-colegas" })
  })

  it("un solo colega: cesión automática a él", () => {
    const ana = colega(7, "Ana")
    expect(resolverCesion([ana])).toEqual({ modo: "automatica", colega: ana })
  })

  it("varios colegas: el dueño elige de la lista", () => {
    const lista = [colega(7, "Ana"), colega(8, "Beto")]
    expect(resolverCesion(lista)).toEqual({ modo: "elegir", colegas: lista })
  })

  it("un autor sin funcionario no se ofrece (bloquea pero no puede recibirla)", () => {
    const ana = colega(7, "Ana")
    expect(resolverCesion([colega(null, "carga masiva"), ana])).toEqual({ modo: "automatica", colega: ana })
    expect(resolverCesion([colega(null, "carga masiva")])).toEqual({ modo: "sin-colegas" })
  })
})

describe("describirUsoColega", () => {
  const rotulo = { singular: "actividad", plural: "actividades" }

  it("concuerda singular y plural y omite los ceros", () => {
    expect(describirUsoColega({ actividades: 1, criterios: 0 }, rotulo)).toBe("1 actividad")
    expect(describirUsoColega({ actividades: 2, criterios: 1 }, rotulo)).toBe("2 actividades · 1 criterio")
    expect(describirUsoColega({ actividades: 0, criterios: 3 }, rotulo)).toBe("3 criterios")
    expect(describirUsoColega({ actividades: 0, criterios: 0 }, rotulo)).toBe("")
  })
})

describe("toUnidadColega", () => {
  it("mapea la fila del backend y tolera nulos", () => {
    expect(toUnidadColega({ fk_tfuncionario: 5, nombre: " Ana ", actividades: 2, criterios: null })).toEqual({
      funcionarioId: 5,
      nombre: "Ana",
      actividades: 2,
      criterios: 0,
    })
    expect(toUnidadColega({ fk_tfuncionario: null, nombre: null, actividades: null, criterios: 1 }).nombre).toBe(
      "Docente sin nombre",
    )
  })
})

import { describe, expect, it } from "vitest"

import { toUnidadColega, type UnidadColega } from "@/features/planeador/api/query/use-unidad-colegas-query"
import {
  actividadesAjenasSinCesion,
  describirUsoColega,
  filtrarColegas,
  resolverCesion,
} from "@/features/planeador/lib/cesion-unidad"

const colega = (funcionarioId: number | null, nombre: string, actividades = 1, criterios = 0): UnidadColega => ({
  funcionarioId,
  nombre,
  identificacion: null,
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

describe("actividadesAjenasSinCesion", () => {
  it("suma solo las actividades de autores que no son cesionarios", () => {
    expect(actividadesAjenasSinCesion([colega(null, "carga masiva", 2), colega(null, "otro", 1), colega(7, "Ana", 5)])).toBe(3)
    expect(actividadesAjenasSinCesion([colega(7, "Ana", 5)])).toBe(0)
  })
})

describe("filtrarColegas", () => {
  const lista = [
    { ...colega(1, "Beatriz Gómez"), identificacion: "1020304050" },
    { ...colega(2, "Carlos Pérez"), identificacion: "79111222" },
    { ...colega(3, "Diana Torres"), identificacion: null },
  ]
  const nombres = (busqueda: string) => filtrarColegas(lista, busqueda).map((c) => c.nombre)

  it("vacío devuelve todos", () => {
    expect(nombres("  ")).toEqual(["Beatriz Gómez", "Carlos Pérez", "Diana Torres"])
  })
  it("por nombre sin tildes, mayúsculas ni orden", () => {
    expect(nombres("gomez")).toEqual(["Beatriz Gómez"])
    expect(nombres("PEREZ carlos")).toEqual(["Carlos Pérez"])
    expect(nombres("tor")).toEqual(["Diana Torres"])
  })
  it("por documento, con o sin separadores", () => {
    expect(nombres("79111")).toEqual(["Carlos Pérez"])
    expect(nombres("1.020.304")).toEqual(["Beatriz Gómez"])
  })
  it("sin coincidencias devuelve vacío", () => {
    expect(nombres("zzz")).toEqual([])
    expect(nombres("555")).toEqual([])
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
      identificacion: null,
      actividades: 2,
      criterios: 0,
    })
    expect(toUnidadColega({ fk_tfuncionario: null, nombre: null, actividades: null, criterios: 1 }).nombre).toBe(
      "Docente sin nombre",
    )
  })
})

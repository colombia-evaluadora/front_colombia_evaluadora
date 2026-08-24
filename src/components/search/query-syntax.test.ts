import { describe, expect, it } from "vitest"

import { buildQuery, optionsTerm, parseQuery, type QuerySyntax } from "@/components/search/query-syntax"

interface Filtros {
  search: string
  statuses: string[]
}

const ESTADOS = [
  { value: "533", label: "Activo" },
  { value: "534", label: "Suspendido" },
]

function sintaxis(opciones: { value: string; label: string }[]): QuerySyntax<Filtros> {
  return {
    empty: { search: "", statuses: [] },
    freeText: { key: "texto", field: "search" },
    terms: [optionsTerm("estado", "statuses", opciones)],
  }
}

describe("buildQuery con catálogo de opciones", () => {
  it("escribe la etiqueta, no el id", () => {
    const texto = buildQuery(sintaxis(ESTADOS), { search: "", statuses: ["533"] })
    expect(texto).toBe("estado:(Activo)")
  })

  it("omite el término mientras el catálogo no cargó", () => {
    // Es el caso del refresh: los filtros vienen de la URL pero el catálogo
    // todavía está en vuelo. Antes se caía al valor crudo y el input mostraba
    // `estado:(533)` — y se quedaba pegado, porque cuando el catálogo llegaba,
    // la guarda de `useQuerySearch` veía que ese texto significaba lo mismo
    // que los filtros y no lo reescribía nunca.
    const texto = buildQuery(sintaxis([]), { search: "", statuses: ["533"] })
    expect(texto).toBe("")
  })

  it("el texto libre sigue saliendo aunque el catálogo no esté", () => {
    // Solo se omite el término del catálogo; lo tecleado por el usuario no
    // depende de ninguna carga y tiene que seguir visible.
    const texto = buildQuery(sintaxis([]), { search: "colegio", statuses: ["533"] })
    expect(texto).toBe("texto:(colegio)")
  })

  it("con el catálogo cargado, un valor que ya no figura sí se muestra crudo", () => {
    // Distinto del anterior: acá el catálogo SÍ está y el valor no aparece.
    // Eso es un dato real —el estado fue dado de baja— y esconderlo dejaría
    // un filtro activo que no se ve en ningún lado.
    const texto = buildQuery(sintaxis(ESTADOS), { search: "", statuses: ["999"] })
    expect(texto).toBe("estado:(999)")
  })
})

describe("parseQuery", () => {
  it("acepta la etiqueta y devuelve el id", () => {
    expect(parseQuery(sintaxis(ESTADOS), "estado:(Activo)")).toEqual({
      search: "",
      statuses: ["533"],
    })
  })

  it("acepta el id crudo — es lo que hace que el texto viejo siga siendo válido", () => {
    expect(parseQuery(sintaxis(ESTADOS), "estado:(533)")).toEqual({
      search: "",
      statuses: ["533"],
    })
  })
})

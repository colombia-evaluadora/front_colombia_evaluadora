import { describe, expect, it } from "vitest"

import { aSelect, deSelect, etiquetasSelect, SELECT_VACIO, valorSelect } from "@/components/select-opciones"

const opciones = [
  { value: "", label: "Todos" },
  { value: "A", label: "Activo" },
]

describe("centinela de SelectOpciones", () => {
  it("traduce \"\" ↔ __none__ ida y vuelta", () => {
    expect(aSelect("")).toBe(SELECT_VACIO)
    expect(deSelect(SELECT_VACIO)).toBe("")
    expect(aSelect("A")).toBe("A")
    expect(deSelect("A")).toBe("A")
  })

  it("arma el mapa de etiquetas con el centinela", () => {
    expect(etiquetasSelect(opciones)).toEqual({ [SELECT_VACIO]: "Todos", A: "Activo" })
  })

  it("\"\" con opción Todos la selecciona; sin ella muestra el placeholder", () => {
    expect(valorSelect("", etiquetasSelect(opciones))).toBe(SELECT_VACIO)
    expect(valorSelect("", etiquetasSelect(opciones.slice(1)))).toBeNull()
    expect(valorSelect(undefined, etiquetasSelect(opciones.slice(1)))).toBeNull()
  })

  it("un valor sin opción que lo represente cae al placeholder", () => {
    expect(valorSelect("X", etiquetasSelect(opciones))).toBeNull()
    expect(valorSelect("A", etiquetasSelect(opciones))).toBe("A")
  })
})

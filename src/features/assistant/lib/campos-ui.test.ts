import { describe, expect, it } from "vitest"

import {
  aBooleano,
  aFecha,
  aNumero,
  opcionesDeCatalogo,
  resolverCatalogo,
  resolverOpcion,
  valorFiltroComo,
} from "@/features/assistant/lib/campos-ui"

const catalogo = [
  { id: 1, name: "Cédula de ciudadanía", code: "CC" },
  { id: 2, name: "Tarjeta de identidad", code: "TI" },
]

describe("catálogos", () => {
  it("expone el pk como valor", () => {
    expect(opcionesDeCatalogo(catalogo)).toEqual([
      { valor: "1", etiqueta: "Cédula de ciudadanía" },
      { valor: "2", etiqueta: "Tarjeta de identidad" },
    ])
  })

  it("resuelve por id, código o nombre sin tildes", () => {
    expect(resolverCatalogo(catalogo, "2")?.id).toBe(2)
    expect(resolverCatalogo(catalogo, 1)?.id).toBe(1)
    expect(resolverCatalogo(catalogo, "ti")?.id).toBe(2)
    expect(resolverCatalogo(catalogo, "cedula de ciudadania")?.id).toBe(1)
    expect(resolverCatalogo(catalogo, "pasaporte")).toBeNull()
  })

  it("resuelve opciones por valor o etiqueta", () => {
    const opciones = [{ valor: "Híbrida", etiqueta: "Híbrida" }]
    expect(resolverOpcion(opciones, "hibrida")).toBe("Híbrida")
    expect(resolverOpcion(opciones, "otra")).toBeNull()
  })
})

describe("conversiones", () => {
  it("booleanos S/N", () => {
    expect(aBooleano("S")).toBe(true)
    expect(aBooleano("no")).toBe(false)
    expect(aBooleano("tal vez")).toBeNull()
  })

  it("números y fechas", () => {
    expect(aNumero("3,5")).toBe(3.5)
    expect(aNumero("x")).toBeNull()
    expect(aFecha("2026-10-16T08:00")).toBe("2026-10-16")
    expect(aFecha("16/10/2026")).toBeNull()
  })

  it("filtros toman la forma del valor actual", () => {
    expect(valorFiltroComo([], "A,B")).toEqual(["A", "B"])
    expect(valorFiltroComo([], ["A"])).toEqual(["A"])
    expect(valorFiltroComo("", 5)).toBe("5")
    expect(valorFiltroComo("", null)).toBe("")
  })
})

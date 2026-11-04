import { describe, expect, it } from "vitest"

import { opcionesValidas, validarOpciones } from "@/features/comunicaciones/chat/lib/encuesta-academica"

describe("validarOpciones", () => {
  it("acepta de 2 a 10 opciones con texto", () => {
    expect(opcionesValidas(["a", "b"])).toBe(true)
    expect(opcionesValidas(Array(10).fill("a"))).toBe(true)
  })

  it("rechaza menos de 2 o más de 10", () => {
    expect(opcionesValidas(["a"])).toBe(false)
    expect(opcionesValidas(Array(11).fill("a"))).toBe(false)
  })

  it("señala la opción vacía o de más de 150 caracteres", () => {
    expect(Object.keys(validarOpciones(["", "b".repeat(151), "c"]).porOpcion)).toEqual(["0", "1"])
  })
})

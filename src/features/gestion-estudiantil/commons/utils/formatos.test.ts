import { describe, expect, it } from "vitest"

import { abreviarPersona } from "./formatos"

describe("abreviarPersona", () => {
  it.each([
    ["Carolina", "Carolina"],
    ["Carolina Medina", "C. Medina"],
    ["Carolina Medina Ruiz", "C. Medina"],
    ["Carolina Andrea Medina Ruiz", "C. Medina"],
    ["Juan Pablo de la Torre Gómez", "J. de la Torre"],
    ["Ana del Río Pérez", "A. del Río"],
    ["  Carolina   Andrea  Medina   Ruiz ", "C. Medina"],
    ["", ""],
  ])("%j -> %j", (entrada, esperado) => {
    expect(abreviarPersona(entrada)).toBe(esperado)
  })

  it("acepta null, undefined y PersonaDTO", () => {
    expect(abreviarPersona(null)).toBe("")
    expect(abreviarPersona(undefined)).toBe("")
    expect(abreviarPersona({ nombre: "Carolina Medina" } as never)).toBe("C. Medina")
  })
})

import { describe, expect, it } from "vitest"

import { abreviarPersona, formatFechaHora12 } from "./formatos"

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

describe("formatFechaHora12", () => {
  it("muestra la hora tal cual, sin convertir de zona", () => {
    expect(formatFechaHora12("2027-05-18T14:00:00")).toBe("18/05/2027 2:00 p. m.")
    expect(formatFechaHora12("2027-05-18T14:00:00Z")).toBe("18/05/2027 2:00 p. m.")
    expect(formatFechaHora12("2027-05-18T00:30:00-05:00")).toBe("18/05/2027 12:30 a. m.")
  })

  it("vacío o solo fecha", () => {
    expect(formatFechaHora12(null)).toBe("")
    expect(formatFechaHora12("2027-05-18")).toBe("18/05/2027")
  })
})

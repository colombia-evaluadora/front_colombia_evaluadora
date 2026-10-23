import { describe, expect, it } from "vitest"
import { z } from "zod"

import {
  fechaLimiteMayorDeEdad,
  toDocumentoInput,
  toNombreInput,
  validarFormatoPersona,
  validarNombrePersona,
} from "@/features/establishment/shared/person-field-rules"

function issuesDe(persona: Parameters<typeof validarFormatoPersona>[0]) {
  const schema = z.custom<typeof persona>().superRefine((p, ctx) => validarFormatoPersona(p, ctx))
  const result = schema.safeParse(persona)
  return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path.join("."), i.message]))
}

// Ejemplos del caso de prueba E04HU02 (Mantis 0000694).
describe("validarNombrePersona", () => {
  it.each(["Ka'el", "D'Angelo", "D’Angelo", "Jean-Pierre", "María José", "Muñoz", "De la Cruz", "Müller", "François", "Li"])(
    "acepta %s",
    (valor) => expect(validarNombrePersona(valor, "El nombre")).toBeNull(),
  )

  it.each(["+++", "'''", "A++", "12345", "Ç'Ç'++<<", "Juan2", "-Ana", "Ana-", "Jean--Pierre", "D''Angelo", "A"])(
    "rechaza %s",
    (valor) => expect(validarNombrePersona(valor, "El nombre")).not.toBeNull(),
  )

  it("el input deja letras, espacios, apóstrofos y guion, en mayúsculas", () => {
    expect(toNombreInput("d'angelo 2+<")).toBe("D'ANGELO ")
  })
})

describe("documento según el tipo", () => {
  it("numérico (CC): solo dígitos", () => {
    expect(issuesDe({ documentType: { code: "CC" }, identification: "1234567890" })).toEqual({})
    expect(issuesDe({ documentType: { code: "CC" }, identification: "AB12345" })).toHaveProperty("identification")
    expect(toDocumentoInput("12.345-ab", "CC")).toBe("12345")
  })

  it("alfanumérico (PA): letras y dígitos, con al menos un dígito", () => {
    expect(issuesDe({ documentType: { code: "PA" }, identification: "AB123456" })).toEqual({})
    expect(issuesDe({ documentType: { code: "PA" }, identification: "ABCDEF" })).toHaveProperty("identification")
    expect(toDocumentoInput("ab-123 456", "PA")).toBe("AB123456")
  })

  it("no rechaza una longitud poco habitual dentro del rango", () => {
    expect(issuesDe({ documentType: { code: "CC" }, identification: "123" })).toEqual({})
  })
})

describe("teléfono", () => {
  it.each(["6012345", "3001234567", "6041234567"])("acepta %s", (phone) =>
    expect(issuesDe({ phone })).toEqual({}),
  )
  it.each(["77665", "123", "12345678"])("rechaza %s", (phone) =>
    expect(issuesDe({ phone })).toHaveProperty("phone"),
  )
})

describe("fecha de nacimiento", () => {
  it("acepta a quien cumple 18 hoy y rechaza a quien los cumple mañana", () => {
    const limite = fechaLimiteMayorDeEdad()
    expect(issuesDe({ birthDate: limite })).toEqual({})
    const [y, m, d] = limite.split("-").map(Number)
    const manana = new Date(y, m - 1, d + 1)
    const texto = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, "0")}-${String(manana.getDate()).padStart(2, "0")}`
    expect(issuesDe({ birthDate: texto })).toHaveProperty("birthDate")
  })
})

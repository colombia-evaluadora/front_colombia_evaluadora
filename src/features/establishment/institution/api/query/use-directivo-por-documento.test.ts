import { describe, expect, it } from "vitest"

import type { PersonaPorDocumento } from "@/features/establishment/employees/api/types/funcionario"
import { toPersonaProtegida } from "@/features/establishment/institution/api/query/use-directivo-por-documento"

const cedula = { id: 1, code: "CC", name: "Cédula de ciudadanía" }

function persona(overrides: Partial<PersonaPorDocumento> = {}): PersonaPorDocumento {
  return {
    dataRestricted: false,
    userId: 10,
    funcionarioId: 20,
    documentTypeId: 1,
    identification: "91234567",
    firstName: "HERNANDO",
    middleName: "",
    lastName: "SUAREZ",
    secondLastName: "PINTO",
    birthDate: "1972-03-14",
    genderId: 5,
    genderName: "Masculino",
    emailProtected: "re****@ie***.co",
    phoneProtected: "315***4321",
    accountEmail: null,
    photoArchivoId: null,
    linked: false,
    ...overrides,
  }
}

describe("toPersonaProtegida", () => {
  it("funcionario existente: queda protegido, con su funcionario y el contacto enmascarado", () => {
    const p = toPersonaProtegida(persona(), cedula)

    expect(p.protegida).toBe(true)
    expect(p.id).toBe(20)
    expect(p.documentType).toBe(cedula)
    expect(p.email).toBe("re****@ie***.co")
    expect(p.phone).toBe("315***4321")
    expect(p.gender).toEqual({ id: 5, code: "", name: "Masculino" })
  })

  it("solo con cuenta (p. ej. acudiente): sin funcionario y con el correo de la cuenta para crearle el perfil", () => {
    const p = toPersonaProtegida(persona({ funcionarioId: null, accountEmail: "acudiente@example.com" }), cedula)

    expect(p.id).toBeUndefined()
    expect(p.accountEmail).toBe("acudiente@example.com")
    expect(p.protegida).toBe(true)
  })

  it("sin autorización del establecimiento (Regla 116): lo marca y no inventa el género", () => {
    const p = toPersonaProtegida(persona({ dataRestricted: true, genderId: null, genderName: "" }), cedula)

    expect(p.datosRestringidos).toBe(true)
    expect(p.gender).toBeNull()
  })
})

import { describe, expect, it } from "vitest"

import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"
import type { Person } from "@/features/establishment/employees/api/types/person"
import { validateEstablishmentForm } from "@/features/establishment/institution/utils/validate-form"

function createPerson(overrides: Partial<Person> = {}): Person {
  return {
    id: "person-1",
    documentType: { id: "cc", code: "CC", name: "Cédula de ciudadanía" },
    identification: "1000000000",
    firstName: "Juan",
    lastName: "Pérez",
    middleName: "",
    secondLastName: "",
    birthDate: "1990-01-01",
    gender: { id: "m", code: "M", name: "Masculino" },
    email: "person@example.com",
    phone: "3000000000",
    password: "12345678",
    ...overrides,
  }
}

/**
 * Persona vacía: representa el caso "no se asignó rector/secretaria".
 * Como los 4 mínimos están vacíos, NO debe disparar errores de validación.
 */
function createEmptyPerson(): Person {
  return {
    id: "",
    documentType: null,
    identification: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: null,
    email: "",
    phone: "",
    password: "",
  }
}

function createValues(overrides: Partial<EstablishmentDetails> = {}): EstablishmentDetails {
  const defaults: EstablishmentDetails = {
    id: "establishment-1",
    basicInfo: {
      name: "I.E. Prueba",
      dane: "12345678",
      nit: "900123456",
      ownershipType: { id: "oficial", code: "OFFICIAL", name: "Oficial" },
    },
    address: {
      municipality: {
        id: "11001",
        code: "11001",
        name: "Bogotá",
        department: { id: "11", code: "11", name: "Bogotá" },
      },
      zone: { id: "urbana", code: "URBANA", name: "Urbana" },
      district: { id: "", code: "", name: "" },
      commune: { id: "", code: "", name: "" },
      locality: { id: "", code: "", name: "" },
      address: "",
    },
    contact: {
      email: "",
      website: "",
      phone: "",
      fax: "",
    },
    additionalInfo: {
      approvalResolution: "",
      teachingLanguage: { id: "", code: "", name: "" },
      calendar: { id: "", code: "", name: "" },
      costRegime: { id: "", code: "", name: "" },
      populationGender: { id: "", code: "", name: "" },
      tuitionRange: { id: "", code: "", name: "" },
      disabilityType: { id: "", code: "", name: "" },
      operatingLicense: false,
      licenseStatus: { id: "", code: "", name: "" },
      licenseDate: null,
      ethnicAttention: false,
      giftedAttention: false,
      subsidy: false,
    },
    principal: createEmptyPerson(),
    secretary: createEmptyPerson(),
  }

  return {
    ...defaults,
    ...overrides,
    basicInfo: { ...defaults.basicInfo, ...overrides.basicInfo },
    address: { ...defaults.address, ...overrides.address },
    contact: { ...defaults.contact, ...overrides.contact },
    additionalInfo: { ...defaults.additionalInfo, ...overrides.additionalInfo },
  }
}

const defaultConfirmPasswords = {
  principal: "",
  secretary: "",
}

describe("validateEstablishmentForm", () => {
  it("acepta un establecimiento vacío cuando rector y secretaria no fueron asignados", () => {
    const values = createValues()

    const { errors } = validateEstablishmentForm(values, defaultConfirmPasswords)

    expect(errors).toEqual([])
  })

  it("rechaza cuando falta el nombre del establecimiento", () => {
    const values = createValues({
      basicInfo: {
        name: "",
        dane: "12345678",
        nit: "900123456",
        ownershipType: { id: "oficial", code: "OFFICIAL", name: "Oficial" },
      },
    })

    const { errors } = validateEstablishmentForm(values, defaultConfirmPasswords)

    expect(errors).toContain("Nombre del establecimiento")
  })

  it("rechaza cuando rector/secretaria tienen información parcial (faltan mínimos)", () => {
    const values = createValues({
      principal: createPerson({
        identification: "", // falta el número de documento
      }),
      secretary: createPerson({
        id: "secretary-1",
        firstName: "María",
        lastName: "Gómez",
      }),
    })

    const { errors, invalidFields } = validateEstablishmentForm(values, defaultConfirmPasswords)

    expect(errors).toContain("Rector: número de documento")
    expect(invalidFields).toContain("principal.identification")
  })

  it("acepta rector y secretaria con sólo los 4 mínimos completos", () => {
    const values = createValues({
      principal: createPerson({
        birthDate: "",
        email: "",
        phone: "",
        password: "",
        gender: null,
        middleName: "",
        secondLastName: "",
      }),
      secretary: createPerson({
        id: "secretary-1",
        firstName: "María",
        lastName: "Gómez",
        birthDate: "",
        email: "",
        phone: "",
        password: "",
        gender: null,
        middleName: "",
        secondLastName: "",
      }),
    })

    const { errors, invalidFields } = validateEstablishmentForm(
      values,
      { principal: "", secretary: "" }
    )

    expect(errors).toEqual([])
    expect(invalidFields).toEqual([])
  })

  it("rechaza contraseñas no coincidentes sólo si alguna fue escrita", () => {
    const values = createValues({
      principal: createPerson({
        password: "12345678",
      }),
    })

    const { errors } = validateEstablishmentForm(values, {
      principal: "87654321",
      secretary: "",
    })

    expect(errors).toContain("Rector: las contraseñas no coinciden")
  })

  it("no exige contraseñas si ninguno de los dos campos está lleno", () => {
    const values = createValues({
      principal: createPerson({ password: "" }),
      secretary: createEmptyPerson(),
    })

    const { errors } = validateEstablishmentForm(values, {
      principal: "",
      secretary: "",
    })

    expect(errors).not.toContain("contraseña")
  })

  it("permite campos opcionales del establecimiento vacíos (contacto, complementaria)", () => {
    const values = createValues()

    const { errors } = validateEstablishmentForm(values, defaultConfirmPasswords)

    expect(errors).not.toContain("Correo electrónico")
    expect(errors).not.toContain("Teléfono")
    expect(errors).not.toContain("Resolución de aprobación")
  })
})

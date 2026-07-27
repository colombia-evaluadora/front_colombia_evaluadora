import { describe, expect, it } from "vitest"

import type { EstablishmentDetails } from "../api/types/establishment"
import type { Person } from "../api/types/person"
import { validateEstablishmentForm } from "./validate-establishment-form"

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
    confirmPassword: "12345678",
    ...overrides,
  }
}

function createEstablishmentValues(overrides: Partial<EstablishmentDetails> = {}): EstablishmentDetails {
  return {
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
      district: { id: "district-1", code: "01", name: "Distrito 1" },
      commune: { id: "", code: "", name: "" },
      locality: { id: "locality-1", code: "01", name: "Localidad 1" },
      address: "Calle 123",
    },
    contact: {
      email: "test@example.com",
      website: "",
      phone: "3000000000",
      fax: "3000000001",
    },
    additionalInfo: {
      approvalResolution: "RES-001",
      teachingLanguage: { id: "es", code: "ES", name: "Español" },
      calendar: { id: "a", code: "A", name: "Calendario A" },
      costRegime: { id: "libertad-vigilada", code: "LIBERTAD_VIGILADA", name: "Libertad Vigilada" },
      populationGender: { id: "m", code: "M", name: "Masculino" },
      tuitionRange: { id: "menor-06", code: "<0.6", name: "Menor de 0.6 SMLV" },
      disabilityType: { id: "na", code: "NA", name: "No aplica" },
      operatingLicense: true,
      licenseStatus: { id: "vigente", code: "VIGENTE", name: "Vigente" },
      licenseDate: null,
      ethnicAttention: false,
      giftedAttention: false,
      subsidy: false,
    },
    principal: createPerson(),
    secretary: createPerson({
      id: "secretary-1",
      firstName: "María",
      lastName: "Gómez",
      email: "secretary@example.com",
      phone: "3000000001",
      gender: { id: "f", code: "F", name: "Femenino" },
    }),
    ...overrides,
  }
}

describe("validateEstablishmentForm", () => {
  it("allows blank second names, blank commune and blank website while rejecting other empty required fields", () => {
    const values = createEstablishmentValues({
      basicInfo: {
        ...createEstablishmentValues().basicInfo,
        name: "",
      },
      address: {
        ...createEstablishmentValues().address,
        commune: { id: "", code: "", name: "" },
      },
      contact: {
        ...createEstablishmentValues().contact,
        website: "",
      },
      principal: createPerson({
        middleName: "",
        secondLastName: "",
      }),
      secretary: createPerson({
        id: "secretary-1",
        firstName: "María",
        lastName: "Gómez",
        email: "secretary@example.com",
        phone: "3000000001",
        gender: { id: "f", code: "F", name: "Femenino" },
        middleName: "",
        secondLastName: "",
      }),
    })

    const { errors } = validateEstablishmentForm(values)

    expect(errors).toContain("Nombre del establecimiento")
    expect(errors).not.toContain("Segundo nombre")
    expect(errors).not.toContain("Segundo apellido")
    expect(errors).not.toContain("Comuna")
    expect(errors).not.toContain("Página web")
  })

  it("rejects mismatched passwords", () => {
    const values = createEstablishmentValues({
      principal: createPerson({
        password: "12345678",
        confirmPassword: "87654321",
      }),
    })

    const { errors } = validateEstablishmentForm(values)

    expect(errors).toContain("Confirmación de contraseña")
  })
})

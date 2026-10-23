import { describe, expect, it } from "vitest"

import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"
import type { Person } from "@/features/establishment/employees/api/types/person"
import { validateEstablishmentForm } from "@/features/establishment/institution/utils/validate-form"

function createPerson(overrides: Partial<Person> = {}): Person {
  return {
    id: 1,
    documentType: { id: 1, code: "CC", name: "Cédula de ciudadanía" },
    identification: "1000000000",
    firstName: "Juan",
    lastName: "Pérez",
    middleName: "",
    secondLastName: "",
    birthDate: "1990-01-01",
    gender: { id: 1, code: "M", name: "Masculino" },
    email: "person@example.com",
    phone: "3000000000",
    ...overrides,
  }
}

/**
 * Persona vacía: representa el caso "no se asignó rector/secretaria".
 * Como los 4 mínimos están vacíos, NO debe disparar errores de validación.
 * Sin `id`: todavía no se persistió.
 */
function createEmptyPerson(): Person {
  return {
    documentType: null,
    identification: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: null,
    email: "",
    phone: "",
  }
}

function createValues(overrides: Partial<EstablishmentDetails> = {}): EstablishmentDetails {
  const defaults: EstablishmentDetails = {
    id: 1,
    basicInfo: {
      name: "I.E. Prueba",
      // DANE de 12 dígitos y NIT con dígito de verificación (reglas actuales).
      dane: "123456789012",
      nit: "900123456-7",
      ownershipType: { id: 1, code: "OFFICIAL", name: "Oficial" },
    },
    address: {
      municipality: {
        id: 11001,
        code: "11001",
        name: "Bogotá",
        department: { id: 11, code: "11", name: "Bogotá" },
      },
      zone: { id: 1, code: "URBANA", name: "Urbana" },
      district: null,
      commune: null,
      locality: null,
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
      teachingLanguage: null,
      calendar: null,
      costRegime: null,
      populationGender: null,
      tuitionRange: null,
      disabilityType: null,
      operatingLicense: false,
      licenseStatus: "",
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

describe("validateEstablishmentForm", () => {
  it("rechaza un establecimiento sin rector: es obligatorio (a diferencia de la secretaria)", () => {
    const values = createValues()

    const { errors, invalidFields } = validateEstablishmentForm(values)

    expect(errors).toContain("Rector: tipo de documento")
    expect(invalidFields).toContain("principal.documentType")
  })

  it("acepta un establecimiento con rector completo y secretaria sin asignar", () => {
    const values = createValues({
      principal: createPerson(),
    })

    const { errors } = validateEstablishmentForm(values)

    expect(errors).toEqual([])
  })

  it("rechaza cuando falta el nombre del establecimiento", () => {
    const values = createValues({
      basicInfo: {
        name: "",
        // DANE de 12 dígitos y NIT con dígito de verificación (reglas actuales).
        dane: "123456789012",
        nit: "900123456-7",
        ownershipType: { id: 1, code: "OFFICIAL", name: "Oficial" },
      },
    })

    const { errors } = validateEstablishmentForm(values)

    expect(errors).toContain("Nombre del establecimiento")
  })

  it("rechaza cuando rector/secretaria tienen información parcial (faltan mínimos)", () => {
    const values = createValues({
      principal: createPerson({
        identification: "", // falta el número de documento
      }),
      secretary: createPerson({
        id: 2,
        firstName: "María",
        lastName: "Gómez",
      }),
    })

    const { errors, invalidFields } = validateEstablishmentForm(values)

    expect(errors).toContain("Rector: número de documento")
    expect(invalidFields).toContain("principal.identification")
  })

  it("acepta rector y secretaria con sólo los 4 mínimos completos", () => {
    const values = createValues({
      principal: createPerson({
        birthDate: "",
        email: "",
        phone: "",
        gender: null,
        middleName: "",
        secondLastName: "",
      }),
      secretary: createPerson({
        id: 2,
        firstName: "María",
        lastName: "Gómez",
        birthDate: "",
        email: "",
        phone: "",
        gender: null,
        middleName: "",
        secondLastName: "",
      }),
    })

    const { errors, invalidFields } = validateEstablishmentForm(values)

    expect(errors).toEqual([])
    expect(invalidFields).toEqual([])
  })

  it("exige correo (no contraseña) al dar de alta un rector nuevo: la activación llega por correo", () => {
    const values = createValues({
      principal: createPerson({ id: undefined, email: "" }),
      secretary: createEmptyPerson(),
    })

    const { errors, invalidFields } = validateEstablishmentForm(values)

    expect(errors).toContain("Rector: correo electrónico")
    expect(invalidFields).not.toContain("principal.password")
    expect(invalidFields).not.toContain("principal.confirmPassword")
  })

  it("permite campos opcionales del establecimiento vacíos (contacto, complementaria)", () => {
    const values = createValues()

    const { errors } = validateEstablishmentForm(values)

    expect(errors).not.toContain("Correo electrónico")
    expect(errors).not.toContain("Teléfono")
    expect(errors).not.toContain("Resolución de aprobación")
  })

  it("rechaza los valores del caso de prueba en domicilio y complementaria, con su mensaje", () => {
    const place = (name: string) => ({ id: 0, code: name, name })
    const values = createValues({
      principal: createPerson(),
      basicInfo: { name: "Wahucio'''---- ----.ccccc" } as EstablishmentDetails["basicInfo"],
      address: {
        district: place("cccccccccccc----"),
        address: "6767676ghhggh",
        commune: place("..."),
        locality: place("-+-"),
      } as EstablishmentDetails["address"],
      additionalInfo: {
        approvalResolution: "çç()",
        licenseStatus: "abc",
        licenseDate: "2999-01-01",
      } as EstablishmentDetails["additionalInfo"],
    })

    const { invalidFields, fieldErrors } = validateEstablishmentForm(values)

    expect(invalidFields).toEqual(
      expect.arrayContaining([
        "basicInfo.name",
        "address.district",
        "address.address",
        "address.commune",
        "address.locality",
        "additionalInfo.approvalResolution",
        "additionalInfo.licenseStatus",
        "additionalInfo.licenseDate",
      ]),
    )
    expect(fieldErrors["additionalInfo.licenseDate"]).toBe("La fecha de la licencia no puede ser posterior a hoy.")
  })

  it("acepta valores válidos de domicilio y complementaria", () => {
    const place = (name: string) => ({ id: 0, code: name, name })
    const values = createValues({
      principal: createPerson(),
      address: {
        district: place("El Prado"),
        address: "CR 5 # 26D-7A",
        commune: place("Comuna 5"),
        locality: place("Suba"),
      } as EstablishmentDetails["address"],
      additionalInfo: { approvalResolution: "Resolución 1234 de 2010", licenseStatus: "0045/2019", licenseDate: "2019-05-02" } as EstablishmentDetails["additionalInfo"],
    })

    expect(validateEstablishmentForm(values).errors).toEqual([])
  })

  it("con el panel de directivos en solo lectura no valida rector ni secretaria", () => {
    // Rector vacío y secretaria con un nombre que hoy no pasa: nada de eso se guarda.
    const values = createValues({
      principal: createEmptyPerson(),
      secretary: { ...createPerson(), firstName: "JUAN2" },
    })

    expect(validateEstablishmentForm(values).invalidFields).toContain("principal.documentType")
    expect(validateEstablishmentForm(values, {}, { validarDirectivos: false }).errors).toEqual([])
  })
})

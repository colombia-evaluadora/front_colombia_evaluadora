import { faker } from "@faker-js/faker"

import type {
  Establishment,
  EstablishmentDetails,
  EstablishmentStatus,
} from "@/features/establishment/api/types/establishment"
import type { CatalogItem } from "@/features/establishment/api/types/catalog"
import type { Municipality } from "@/features/establishment/api/types/location"
import type { Person } from "@/features/establishment/api/types/person"
import { CALENDARS, COST_REGIMEN, DISABILITIES, IDIOMAS, LEGAL_TYPES, LICENSE_STATUSES, RANGO_TARIFAS, ZONES } from "../db/catalogs/establishment"
import { DOCUMENT_TYPES } from "../db/catalogs/document-types"
import { GENDERS } from "../db/catalogs/genders"
import { POPULATION_GENDERS } from "../db/catalogs/population-genders"
import { MUNICIPALITIES } from "../db/catalogs/municipalities"

faker.seed(20260722)

const ESTABLISHMENT_NAMES = [
  "I.E. JORGE GARCÍA USTA LA SALLE BICENTENARIO",
  "I.E. NUESTRA SEÑORA DE FÁTIMA",
  "I.E. CLEMENTE MANUEL ZABALA",
  "I.E. SAN JOSÉ",
  "I.E. LA ESPERANZA",
  "I.E. NUEVO HORIZONTE",
  "I.E. TÉCNICA INDUSTRIAL",
  "I.E. JOSÉ CELESTINO MUTIS",
  "I.E. SIMÓN BOLÍVAR",
  "I.E. FRANCISCO DE PAULA SANTANDER",
  "I.E. NUESTRA SEÑORA DEL CARMEN",
  "I.E. MARÍA AUXILIADORA",
  "I.E. EL BOSQUE",
  "I.E. LOS ALPES",
  "I.E. SAN FRANCISCO",
  "I.E. LA INMACULADA",
  "I.E. SANTA TERESITA",
  "I.E. CIUDADELA EDUCATIVA",
  "I.E. TÉCNICO COMERCIAL",
  "I.E. VILLA ESTADIO",
]

const DISTRICTS = [
  { code: "01", name: "Distrito 1" },
  { code: "02", name: "Distrito 2" },
  { code: "03", name: "Distrito 3" },
]

const COMMUNES = [
  { code: "01", name: "Comuna 1" },
  { code: "02", name: "Comuna 2" },
  { code: "03", name: "Comuna 3" },
]

const LOCALITIES = [
  { code: "01", name: "Localidad 1" },
  { code: "02", name: "Localidad 2" },
  { code: "03", name: "Localidad 3" },
]

function generateDane(): string {
  return faker.string.numeric({ length: 8, allowLeadingZeros: false })
}

function generateNit(): string {
  return faker.string.numeric({ length: 9, allowLeadingZeros: false })
}

/**
 * El `id` del catálogo real se conserva tal cual: los `<Select>` del formulario
 * resuelven la etiqueta buscando ese id entre las opciones de `/api/catalogs/*`,
 * así que inventar un uuid acá hacía que al editar se viera el id crudo en vez
 * del nombre. Solo las listas ad-hoc (sin `id` propio) reciben uno generado.
 */
function createCatalogItem(items: Array<{ id?: string; code: string; name: string }>): CatalogItem {
  const item = faker.helpers.arrayElement(items)

  return {
    id: item.id ?? faker.string.uuid(),
    code: item.code,
    name: item.name,
  }
}

function createMunicipality(): Municipality {
  const municipality = faker.helpers.arrayElement(MUNICIPALITIES)

  return {
    id: municipality.id,
    code: municipality.id,
    name: municipality.name,
    department: {
      id: municipality.department.id,
      code: municipality.department.id,
      name: municipality.department.name,
    },
  }
}

function createPerson(): Person {
  return {
    id: faker.string.uuid(),
    documentType: createCatalogItem(DOCUMENT_TYPES),
    identification: faker.string.numeric({ length: 10, allowLeadingZeros: false }),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    birthDate: faker.date.birthdate({ min: 25, max: 70, mode: "age" }).toISOString(),
    gender: createCatalogItem(GENDERS),
    email: faker.internet.email(),
    phone: faker.phone.number({ style: "international" }),
    password: faker.internet.password({ length: 12 }),
  }
}

function createEstablishmentDetails(): EstablishmentDetails {
  const name = faker.helpers.arrayElement(ESTABLISHMENT_NAMES)
  const municipality = createMunicipality()

  return {
    id: faker.string.uuid(),
    basicInfo: {
      name,
      dane: generateDane(),
      nit: generateNit(),
      ownershipType: createCatalogItem(LEGAL_TYPES),
    },
    address: {
      municipality,
      zone: createCatalogItem(ZONES),
      district: createCatalogItem(DISTRICTS),
      commune: createCatalogItem(COMMUNES),
      locality: createCatalogItem(LOCALITIES),
      address: faker.location.streetAddress(),
    },
    contact: {
      email: faker.internet.email({ firstName: name.replace(/\s+/g, "").toLowerCase() }),
      website: faker.internet.url(),
      phone: faker.phone.number({ style: "international" }),
      fax: faker.phone.number({ style: "international" }),
    },
    additionalInfo: {
      approvalResolution: `RES-${faker.string.numeric({ length: 4, allowLeadingZeros: true })}`,
      teachingLanguage: createCatalogItem(IDIOMAS),
      calendar: createCatalogItem(CALENDARS),
      costRegime: createCatalogItem(COST_REGIMEN),
      populationGender: createCatalogItem(POPULATION_GENDERS),
      tuitionRange: createCatalogItem(RANGO_TARIFAS),
      disabilityType: createCatalogItem(DISABILITIES),
      operatingLicense: faker.datatype.boolean(),
      licenseStatus: createCatalogItem(LICENSE_STATUSES),
      licenseDate: faker.datatype.boolean() ? faker.date.recent({ days: 365 }).toISOString() : null,
      ethnicAttention: faker.datatype.boolean(),
      giftedAttention: faker.datatype.boolean(),
      subsidy: faker.datatype.boolean(),
    },
    principal: createPerson(),
    secretary: createPerson(),
  }
}

export function createEstablishmentRow(details: EstablishmentDetails): Establishment {
  const status: EstablishmentStatus =
    faker.number.int({ min: 1, max: 100 }) <= 85 ? "ACTIVE" : "SUSPENDED"

  return {
    id: details.id,
    dane: details.basicInfo.dane,
    name: details.basicInfo.name,
    department: details.address.municipality.department.name,
    municipality: details.address.municipality.name,
    status,
  }
}

const establishmentRecords = Array.from({ length: 3 }, () => {
  const details = createEstablishmentDetails()

  return {
    details,
    row: createEstablishmentRow(details),
  }
})

export const establishmentsDb: EstablishmentDetails[] = establishmentRecords.map(
  (record) => record.details
)

export const establishmentsRowsDb: Establishment[] = establishmentRecords.map(
  (record) => record.row
)

export function upsertEstablishmentDetails(details: EstablishmentDetails) {
  const existingIndex = establishmentsDb.findIndex((item) => item.id === details.id)

  if (existingIndex >= 0) {
    establishmentsDb[existingIndex] = details
  } else {
    establishmentsDb.unshift(details)
  }

  const row = createEstablishmentRow(details)
  const rowIndex = establishmentsRowsDb.findIndex((item) => item.id === details.id)

  if (rowIndex >= 0) {
    establishmentsRowsDb[rowIndex] = row
  } else {
    establishmentsRowsDb.unshift(row)
  }

  return { details, row }
}

export function deleteEstablishmentDetails(id: string){
  const existingIndex = establishmentsDb.findIndex((item) => item.id === id)
  const rowIndex = establishmentsRowsDb.findIndex((item) => item.id === id)

  if (existingIndex >= 0) {
    establishmentsDb.splice(existingIndex, 1)
  }

  if (rowIndex >= 0) {
    establishmentsRowsDb.splice(rowIndex, 1)
  }
}

export function deleteManyEstablishmentDetails(ids: string[]) {
  const idSet = new Set(ids)

  for (let index = establishmentsDb.length - 1; index >= 0; index -= 1) {
    if (idSet.has(establishmentsDb[index].id)) {
      establishmentsDb.splice(index, 1)
    }
  }

  for (let index = establishmentsRowsDb.length - 1; index >= 0; index -= 1) {
    if (idSet.has(establishmentsRowsDb[index].id)) {
      establishmentsRowsDb.splice(index, 1)
    }
  }
}

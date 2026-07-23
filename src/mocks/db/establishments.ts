import { faker } from "@faker-js/faker"

import type {
  Establishment,
  EstablishmentStatus,
} from "@/features/establishment/api/types/establishment"

faker.seed(20260722)

/**
 * Departamentos y municipios coherentes.
 * El municipio siempre pertenece al departamento.
 */
const LOCATIONS = [
  {
    department: "Atlántico",
    municipality: "Barranquilla",
  },
  {
    department: "Bolívar",
    municipality: "Cartagena",
  },
  {
    department: "Magdalena",
    municipality: "Santa Marta",
  },
  {
    department: "Antioquia",
    municipality: "Medellín",
  },
  {
    department: "Valle del Cauca",
    municipality: "Cali",
  },
  {
    department: "Santander",
    municipality: "Bucaramanga",
  },
  {
    department: "Cundinamarca",
    municipality: "Bogotá D.C.",
  },
  {
    department: "Risaralda",
    municipality: "Pereira",
  },
  {
    department: "Norte de Santander",
    municipality: "Cúcuta",
  },
  {
    department: "Tolima",
    municipality: "Ibagué",
  },
]

/**
 * Nombres inspirados en instituciones educativas colombianas.
 */
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

function generateDane(): string {
  return faker.string.numeric({
    length: 8,
    allowLeadingZeros: false,
  })
}

function createEstablishment(): Establishment {
  const location = faker.helpers.arrayElement(LOCATIONS)

  const status: EstablishmentStatus =
    faker.number.int({ min: 1, max: 100 }) <= 85
      ? "ACTIVE"
      : "SUSPENDED"

  return {
    id: faker.string.uuid(),

    dane: generateDane(),

    name: faker.helpers.arrayElement(ESTABLISHMENT_NAMES),

    department: location.department,

    municipality: location.municipality,

    status,
  }
}

export const establishmentsDb: Establishment[] = Array.from(
  { length: 350 },
  createEstablishment
)
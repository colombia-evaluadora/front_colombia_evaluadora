import { faker } from "@faker-js/faker"

import type {
  OperationType,
  TableOperation,
} from "@/features/audits/api/types/audit-table"
import { auditTablesDb } from "./audit-tables"

const ENTITY_NAMES_BY_TABLE: Record<string, string[]> = {
  tnivel_ensenanza: ["Preescolar", "Primaria", "Secundaria", "Media", "Superior"],
  tdepartamento: ["Antioquia", "Cundinamarca", "Valle del Cauca", "Bolívar", "Santander"],
  tmunicipio: ["Medellín", "Bogotá D.C.", "Cali", "Cartagena", "Bucaramanga"],
  tente: ["I.E. San José", "Colegio La Salle", "I.E. Simón Bolívar", "I.E. Normal Superior"],
  tpais: ["Colombia", "Venezuela", "Ecuador", "Perú", "Panamá"],
  tmodelo_pedagogico: ["Constructivismo", "Tradicional", "Montessori", "Waldorf"],
  tjornada: ["Mañana", "Tarde", "Noche", "Única", "Sabatina"],
  tcapacidad: ["Aula 101", "Aula 202", "Laboratorio", "Biblioteca"],
  tpropiedad_juridica: ["Oficial", "No oficial", "Contratada"],
  tespecialidad: ["Comercial", "Académica", "Técnica", "Industrial"],
  tetnia: ["Indígena", "Afrocolombiano", "Raizal", "Palenquero", "Ninguna"],
  tresguardo: ["Resguardo Emberá", "Resguardo Wayuu", "Resguardo Nasa"],
}

const OPERATION_WEIGHTS: [OperationType, number][] = [
  ["INSERT", 45],
  ["UPDATE", 40],
  ["DELETE", 15],
]

function pickOperation(): OperationType {
  const total = OPERATION_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = faker.number.float({ min: 0, max: total })
  for (const [operation, weight] of OPERATION_WEIGHTS) {
    if (roll < weight) return operation
    roll -= weight
  }
  return "INSERT"
}

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function pickOccurredAt(): Date {
  if (faker.number.int({ min: 0, max: 100 }) < 20) {
    return faker.date.between({ from: startOfToday(), to: new Date() })
  }
  return faker.date.recent({ days: 30, refDate: startOfToday() })
}

function createOperation(tableSlug: string): TableOperation {
  const names = ENTITY_NAMES_BY_TABLE[tableSlug] ?? ["Registro"]

  return {
    id: faker.string.uuid(),
    operation: pickOperation(),
    authorName: faker.person.fullName(),
    authorAvatarUrl: faker.datatype.boolean(0.7)
      ? faker.image.avatarGitHub()
      : null,
    authorVerified: faker.datatype.boolean(0.8),
    ip: faker.internet.ipv4(),
    entityName: faker.helpers.arrayElement(names),
    entityId: `#${faker.number.int({ min: 100, max: 999 })}`,
    occurredAt: pickOccurredAt().toISOString(),
  }
}

faker.seed(20260716)

// Agrupadas por tabla: el shape público `TableOperation` no lleva el slug
// (no aplica una vez ya filtrada por tabla), así que el mock la guarda aparte.
export const tableOperationsDb: Record<string, TableOperation[]> =
  Object.fromEntries(
    auditTablesDb.map((table) => [
      table.slug,
      Array.from(
        { length: faker.number.int({ min: 40, max: 90 }) },
        () => createOperation(table.slug)
      ),
    ])
  )

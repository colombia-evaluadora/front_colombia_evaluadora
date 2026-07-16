import { faker } from "@faker-js/faker"

import type {
  OperationChange,
  OperationType,
  TableOperation,
} from "@/features/audits/api/types/audit-table"
import { auditTablesDb, getTableFields } from "./audit-tables"

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

// Generador de valores "realistas" por nombre de campo. Compartido por
// `createEntityFields` y `createChanges` para que el valor del registro
// en el momento de la operación coincida con el `after` del diff.
function generateFieldValue(
  field: string,
  entityName: string,
  operation: OperationType
): string | null {
  if (operation === "DELETE") return null
  if (field === "Nombre") return entityName
  if (field === "Código")
    return `INS-${faker.number.int({ min: 1000, max: 9999 })}`
  return faker.lorem.words({ min: 1, max: 3 })
}

function createEntityFields(
  tableSlug: string,
  operation: OperationType,
  entityName: string
): Record<string, string | null> {
  const fields = getTableFields(tableSlug)
  return Object.fromEntries(
    fields.map((field) => [
      field,
      generateFieldValue(field, entityName, operation),
    ])
  )
}

function createOperation(tableSlug: string): TableOperation {
  const names = ENTITY_NAMES_BY_TABLE[tableSlug] ?? ["Registro"]
  const entityName = faker.helpers.arrayElement(names)
  const operation = pickOperation()

  return {
    id: faker.string.uuid(),
    operation,
    authorName: faker.person.fullName(),
    authorAvatarUrl: faker.datatype.boolean(0.7)
      ? faker.image.avatarGitHub()
      : null,
    authorVerified: faker.datatype.boolean(0.8),
    ip: faker.internet.ipv4(),
    entityName,
    entityId: `#${faker.number.int({ min: 100, max: 999 })}`,
    occurredAt: pickOccurredAt().toISOString(),
    // Snapshot de los valores del registro en el momento de la operación.
    // Lo consume el handler para resolver los filtros por campo del sheet.
    entityFields: createEntityFields(tableSlug, operation, entityName),
  }
}

function createChanges(
  tableSlug: string,
  operation: OperationType,
  entityName: string,
  entityFields: Record<string, string | null>
): OperationChange[] {
  const fields = getTableFields(tableSlug)

  return fields.map((field, index) => {
    const entityValue = entityFields[field]

    // INSERT: no había valor anterior, solo el nuevo (igual al snapshot).
    if (operation === "INSERT") {
      return {
        fieldIndex: index,
        field,
        before: null,
        after: entityValue,
        current: entityValue,
      }
    }

    // DELETE: había valor, ya no.
    if (operation === "DELETE") {
      return {
        fieldIndex: index,
        field,
        before: entityValue,
        after: null,
        current: null,
      }
    }

    // UPDATE: el "after" coincide con el snapshot; el "before" se genera
    // distinto. Para que el diff tenga sentido, `after` debe diferir de
    // `before` (de lo contrario no hay revert posible). Si el generador
    // nos dio el mismo valor, forzamos un cambio.
    const baseBefore =
      generateFieldValue(field, entityName, operation) ?? "—"
    const before =
      baseBefore === entityValue
        ? `${baseBefore} (anterior)`
        : baseBefore

    // Simulamos que ~30% de las veces una operación posterior cambió el
    // campo: el "Registro actual" difiere de "Después del cambio".
    const drifted = faker.datatype.boolean(0.3)
    const current = drifted ? faker.lorem.words({ min: 1, max: 3 }) : entityValue

    return {
      fieldIndex: index,
      field,
      before,
      after: entityValue,
      current,
    }
  })
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

// Diff por operación: almacenado separado del `TableOperation` público porque
// el listado paginado no necesita cargar el detalle hasta que se abre el
// diálogo. La clave es `${tableSlug}:${operationId}`.
export const tableOperationChangesDb: Record<
  string,
  Record<string, OperationChange[]>
> = Object.fromEntries(
  auditTablesDb.map((table) => [
    table.slug,
    Object.fromEntries(
      (tableOperationsDb[table.slug] ?? []).map((op) => [
        op.id,
        createChanges(
          table.slug,
          op.operation,
          op.entityName,
          op.entityFields
        ),
      ])
    ),
  ])
)

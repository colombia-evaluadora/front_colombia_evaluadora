import { faker } from "@faker-js/faker"

import { auditTablesDb, getTableFields } from "../db/audit-tables"
import type {
  SessionOperation,
  AuditSession,
} from "@/features/audits/api/types/audit"
import type {
  OperationChange,
  OperationType,
} from "@/features/audits/api/types/audit-table"

// Caché de operaciones por sesión. La generación es determinística
// (faker con el mismo seed produce los mismos valores), pero queremos
// garantizar que el listado y el dialog de "Ver cambios" vean exactamente
// la misma operación para un mismo ID — si cada handler generara al
// vuelo, podrían divergir si el orden de invocación de faker cambia.
const sessionOperationsCache = new Map<string, SessionOperation[]>()

function getCachedSessionOperations(session: AuditSession): SessionOperation[] {
  const cached = sessionOperationsCache.get(session.id)
  if (cached) return cached

  // Sembramos faker con un seed derivado del sessionId para que cada
  // sesión sea estable entre requests, independientemente del estado
  // global de faker.
  faker.seed(hashStringToInt(session.id))

  const generated = generateSessionOperationsFresh(session)
  sessionOperationsCache.set(session.id, generated)
  return generated
}

function generateSessionOperationsFresh(
  session: AuditSession
): SessionOperation[] {
  if (session.operationsCount === 0) return []
  const startedMs = new Date(session.startedAt).getTime()
  const endedMs = session.endedAt
    ? new Date(session.endedAt).getTime()
    : Date.now()
  const range = Math.max(1, endedMs - startedMs)

  return Array.from({ length: session.operationsCount }, (_, index) => {
    const table = faker.helpers.arrayElement(auditTablesDb)
    const operation: OperationType = faker.helpers.weightedArrayElement([
      { value: "INSERT", weight: 45 },
      { value: "UPDATE", weight: 40 },
      { value: "DELETE", weight: 15 },
    ])
    const entityName = faker.lorem.words({ min: 1, max: 3 })
    const occurredAt = new Date(
      startedMs + (range * (index + 1)) / (session.operationsCount + 1)
    )
    return {
      id: `${session.id}-op-${index}`,
      tableSlug: table.slug,
      operation,
      entityName,
      entityId: `#${faker.number.int({ min: 100, max: 999 })}`,
      occurredAt: occurredAt.toISOString(),
      _entityName: entityName, // para generar los cambios consistentes
    } as SessionOperation & { _entityName: string }
  })
}

/**
 * Devuelve las operaciones de la sesión (cacheadas, determinísticas).
 * El listado del sheet y el dialog de "Ver cambios" usan esto para
 * garantizar que vean los mismos datos.
 */
export function getSessionOperations(
  session: AuditSession
): SessionOperation[] {
  return getCachedSessionOperations(session)
}

/**
 * Busca una operación por su ID compuesto (`{sessionId}-op-{index}`).
 * Devuelve `null` si el ID no corresponde a una operación de sesión.
 */
export function getSessionOperationById(
  session: AuditSession,
  operationId: string
): SessionOperation | null {
  return getCachedSessionOperations(session).find(
    (op) => op.id === operationId
  ) ?? null
}

/**
 * Genera los `OperationChange` para una operación de sesión. La
 * estructura es la misma que `createChanges` en `db/table-operations.ts`
 * pero re-implementada acá para no acoplar el dialog de cambios al
 * generator del listing (las entidades de sesión no tienen `entityFields`
 * persistido).
 */
export function getSessionOperationChanges(
  operation: SessionOperation
): OperationChange[] {
  const fields = getTableFields(operation.tableSlug)
  const entityName =
    (operation as SessionOperation & { _entityName?: string })._entityName ??
    operation.entityName

  return fields.map((field, index) => {
    // Para las operaciones de sesión, generamos un set mínimo y
    // determinístico: `after` (o `before`) iguales para todos los
    // campos, con un valor por campo.
    const value =
      field === "Nombre"
        ? entityName
        : field === "Código"
          ? `INS-${hashStringToInt(`${operation.id}-${field}`) % 9000 + 1000}`
          : faker.lorem.words({ min: 1, max: 2 })

    if (operation.operation === "INSERT") {
      return {
        fieldIndex: index,
        field,
        before: null,
        after: value,
        current: value,
      }
    }

    if (operation.operation === "DELETE") {
      return {
        fieldIndex: index,
        field,
        before: value,
        after: null,
        current: null,
      }
    }

    // UPDATE: `before` distinto de `after` para que aparezca diff.
    const before = `${value} (anterior)`
    return {
      fieldIndex: index,
      field,
      before,
      after: value,
      current: value,
    }
  })
}

/**
 * Aplica un revert a una operación de sesión cacheada: marca `after`
 * con el valor de `before` (y `current` también) para que el dialog
 * muestre el estado revertido.
 */
export function applySessionOperationRevert(
  session: AuditSession,
  operationId: string,
  fieldIndexes: number[]
): OperationChange[] | null {
  const operation = getSessionOperationById(session, operationId)
  if (!operation) return null

  const changes = getSessionOperationChanges(operation)
  const validIndexes = new Set(changes.map((c) => c.fieldIndex))
  const reverted: OperationChange[] = changes.map((change) => {
    if (
      fieldIndexes.includes(change.fieldIndex) &&
      validIndexes.has(change.fieldIndex)
    ) {
      if (change.before === null) {
        return { ...change, after: null }
      }
      return { ...change, after: change.before, current: change.before }
    }
    return change
  })

  return reverted
}

// Hash determinístico (FNV-1a 32-bit) para derivar seeds de faker a
// partir del sessionId, sin importar el orden global de invocaciones.
function hashStringToInt(str: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}
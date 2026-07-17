import { http, HttpResponse, delay } from "msw"

import { httpQuery } from "./_http-query"
import {
  getSessionOperationById,
  getSessionOperationChanges,
  applySessionOperationRevert,
} from "./_session-operations"

import { auditsDb } from "../db/audits"
import { auditTablesDb } from "../db/audit-tables"
import { tableOperationChangesDb, tableOperationsDb } from "../db/table-operations"
import type { FieldFilter } from "@/features/audits/api/schema"
import type {
  AuditTable,
  AuditTablesQueryFilters,
  AuditTablesQueryRequest,
  AuditTablesQueryResponse,
  OperationChangesResponse,
  RevertOperationChangeInput,
  RevertOperationChangeResponse,
  TableOperation,
  TableOperationsQueryFilters,
  TableOperationsQueryRequest,
  TableOperationsQueryResponse,
  TableOperationsStats,
  TableOperationsStatsRequest,
} from "@/features/audits/api/types/audit-table"
import type { ExportFormat, ExportResult } from "@/features/audits/api/types/audit"

const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

function isToday(iso: string): boolean {
  const date = new Date(iso)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

// Los campos "desde/hasta" ahora vienen del picker de fecha+hora — el
// valor puede ser "yyyy-MM-dd" (fecha sola) o "yyyy-MM-dd'T'HH:mm" (con
// hora). `new Date(...).toISOString()` normaliza los dos casos en vez
// de concatenar `${value}T00:00:00.000Z` a mano, que rompía si el
// valor ya traía su propia "T".
function toComparableIso(value: string, boundary: "start" | "end"): string {
  const hasTime = value.includes("T")
  const iso = hasTime
    ? value
    : `${value}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}`
  return new Date(iso).toISOString()
}

function matchesFieldFilter(row: TableOperation, filter: FieldFilter): boolean {
  const value = row.entityFields[filter.field]
  if (value === undefined || value === null) return false
  const needle = filter.value.toLowerCase()
  const haystack = value.toLowerCase()
  switch (filter.condition) {
    case "contains":
      return haystack.includes(needle)
    case "equals":
      return haystack === needle
    case "startsWith":
      return haystack.startsWith(needle)
  }
}

function applyFilters(
  rows: TableOperation[],
  filters: TableOperationsQueryFilters
): TableOperation[] {
  return rows.filter((row) => {
    if (filters.author) {
      const needle = filters.author.toLowerCase()
      const matches =
        row.authorName.toLowerCase().includes(needle) ||
        row.ip.toLowerCase().includes(needle)
      if (!matches) return false
    }
    if (
      filters.operations?.length &&
      !filters.operations.includes(row.operation)
    ) {
      return false
    }
    if (
      filters.occurredFrom &&
      row.occurredAt < toComparableIso(filters.occurredFrom, "start")
    ) {
      return false
    }
    if (
      filters.occurredTo &&
      row.occurredAt > toComparableIso(filters.occurredTo, "end")
    ) {
      return false
    }
    if (
      filters.fieldFilters?.length &&
      !filters.fieldFilters.every((filter) => matchesFieldFilter(row, filter))
    ) {
      return false
    }
    return true
  })
}

function sortValue(row: TableOperation, id: string) {
  if (id === "authorIp") return row.authorName
  if (id === "detail") return row.entityName
  return row[id as keyof TableOperation]
}

function applySorting(
  rows: TableOperation[],
  sorting: TableOperationsQueryRequest["sorting"]
): TableOperation[] {
  if (!sorting.length) return rows
  const [{ id, desc }] = sorting
  const sorted = [...rows].sort((a, b) => {
    const av = sortValue(a, id)
    const bv = sortValue(b, id)
    if (av === bv) return 0
    return av > bv ? 1 : -1
  })
  return desc ? sorted.reverse() : sorted
}

function applyAuditTablesSorting(
  rows: AuditTable[],
  sorting: AuditTablesQueryRequest["sorting"]
): AuditTable[] {
  if (!sorting.length) return rows
  const [{ id, desc }] = sorting
  const sorted = [...rows].sort((a, b) => {
    const av = a[id as keyof AuditTable]
    const bv = b[id as keyof AuditTable]
    if (av === bv) return 0
    return av > bv ? 1 : -1
  })
  return desc ? sorted.reverse() : sorted
}

function applyAuditTablesFilters(
  rows: AuditTable[],
  filters: AuditTablesQueryFilters
): AuditTable[] {
  if (!filters.name) return rows
  const needle = filters.name.toLowerCase()
  return rows.filter((row) => row.name.toLowerCase().includes(needle))
}

function getTableRows(slug: string): TableOperation[] {
  return tableOperationsDb[slug] ?? []
}

function computeStats(rows: TableOperation[]): TableOperationsStats {
  return {
    inserts: rows.filter((row) => row.operation === "INSERT").length,
    updates: rows.filter((row) => row.operation === "UPDATE").length,
    deletes: rows.filter((row) => row.operation === "DELETE").length,
  }
}

// Las operaciones de sesión tienen id `{sessionId}-op-{index}`. Este
// helper parsea el id, encuentra la sesión correspondiente y devuelve la
// operación generada por el módulo compartido.
function findSessionOperation(operationId: string) {
  const separatorIndex = operationId.lastIndexOf("-op-")
  if (separatorIndex <= 0) return null
  const sessionId = operationId.slice(0, separatorIndex)
  const session = auditsDb.find((row) => row.id === sessionId)
  if (!session) return null
  return getSessionOperationById(session, operationId)
}

export const auditTablesHandlers = [
  http.get("/api/audit-tables/:slug", async ({ params }) => {
    await delay(150)
    const slug = params.slug as string
    const table = auditTablesDb.find((row) => row.slug === slug)
    if (!table) {
      return HttpResponse.json({ message: "Tabla no encontrada." }, { status: 404 })
    }
    const full: AuditTable = {
      ...table,
      operationsToday: getTableRows(slug).filter((row) =>
        isToday(row.occurredAt)
      ).length,
    }
    return HttpResponse.json(full)
  }),

  httpQuery("/api/audit-tables/query", async ({ request }) => {
    await delay(200)
    const { filters, sorting, pageIndex, pageSize } =
      (await request.json()) as AuditTablesQueryRequest

    const tables: AuditTable[] = auditTablesDb.map((table) => ({
      ...table,
      operationsToday: getTableRows(table.slug).filter((row) =>
        isToday(row.occurredAt)
      ).length,
    }))

    const filtered = applyAuditTablesSorting(
      applyAuditTablesFilters(tables, filters),
      sorting
    )
    const totalCount = filtered.length
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = pageIndex * pageSize
    const rows = filtered.slice(start, start + pageSize)

    return HttpResponse.json<AuditTablesQueryResponse>({
      rows,
      pageCount,
      totalCount,
    })
  }),

  httpQuery(
    "/api/audit-tables/:slug/operations/query",
    async ({ request, params }) => {
      await delay(300)
      const body = (await request.json()) as TableOperationsQueryRequest
      const { filters, sorting, pageIndex, pageSize } = body
      const slug = params.slug as string

      const filtered = applySorting(
        applyFilters(getTableRows(slug), filters),
        sorting
      )
      const totalCount = filtered.length
      const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
      const start = pageIndex * pageSize
      const rows = filtered.slice(start, start + pageSize)

      return HttpResponse.json<TableOperationsQueryResponse>({
        rows,
        pageCount,
        totalCount,
      })
    }
  ),

  httpQuery(
    "/api/audit-tables/:slug/operations/stats",
    async ({ request, params }) => {
      await delay(200)
      const { ids, filters } = (await request.json()) as TableOperationsStatsRequest
      const slug = params.slug as string
      const rows = getTableRows(slug)
      const scoped = ids
        ? rows.filter((row) => ids.includes(row.id))
        : applyFilters(rows, filters ?? {})

      return HttpResponse.json<TableOperationsStats>(computeStats(scoped))
    }
  ),

  http.post(
    "/api/audit-tables/:slug/operations/export",
    async ({ request }) => {
      await delay(600)
      const { ids, format } = (await request.json()) as {
        ids: string[]
        format: ExportFormat
      }

      return HttpResponse.json<ExportResult>({
        status: "ok",
        message: `${ids.length} operación(es) exportada(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
      })
    }
  ),

  http.post(
    "/api/audit-tables/:slug/operations/export-all",
    async ({ request, params }) => {
      await delay(600)
      const { filters, format } = (await request.json()) as {
        filters: TableOperationsQueryFilters
        format: ExportFormat
      }
      const slug = params.slug as string
      const count = applyFilters(getTableRows(slug), filters).length

      return HttpResponse.json<ExportResult>({
        status: "ok",
        message: `${count} operación(es) exportada(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
      })
    }
  ),

  http.get(
    "/api/audit-tables/:slug/operations/:operationId/changes",
    async ({ request, params }) => {
      await delay(250)
      const slug = params.slug as string
      const operationId = params.operationId as string
      const showAll = new URL(request.url).searchParams.get("showAll") === "true"

      // Primero buscamos en `tableOperationsDb[slug]`. Si no está, puede
      // ser una operación generada on-the-fly para una sesión
      // (`{sessionId}-op-{index}`) — la regeneramos para mostrar sus
      // cambios.
      const tableOp = getTableRows(slug).find(
        (row) => row.id === operationId
      )
      const sessionOp = !tableOp
        ? findSessionOperation(operationId)
        : null

      if (!tableOp && !sessionOp) {
        return HttpResponse.json(
          { message: "Operación no encontrada." },
          { status: 404 }
        )
      }

      const allChanges = tableOp
        ? (tableOperationChangesDb[slug]?.[operationId] ?? [])
        : getSessionOperationChanges(sessionOp!)

      // Solo mostramos lo que efectivamente cambió: UPDATE con `before` ===
      // `after`, INSERT con `before === null`, DELETE con `after === null`.
      // Eso es lo que el usuario puede revertir. Cuando el frontend pide
      // `showAll` (toggle "Mostrar todos los campos") devolvemos la lista
      // completa de campos — útiles para ver el contexto del registro.
      const changes = showAll
        ? allChanges
        : allChanges.filter((change) => change.before !== change.after)
      const changedFields = allChanges.filter(
        (change) => change.before !== change.after
      ).length

      const operation = tableOp ?? sessionOp!

      return HttpResponse.json<OperationChangesResponse>({
        operationId,
        operation: operation.operation,
        entityName: operation.entityName,
        entityId: operation.entityId,
        totalFields: allChanges.length,
        changedFields,
        changes,
      })
    }
  ),

  http.post(
    "/api/audit-tables/:slug/operations/:operationId/changes/revert",
    async ({ request, params }) => {
      await delay(500)
      const slug = params.slug as string
      const operationId = params.operationId as string
      const { changes } = (await request.json()) as RevertOperationChangeInput

      // Misma lógica que en /changes: primero tabla, después sesión.
      const tableOp = getTableRows(slug).find(
        (row) => row.id === operationId
      )
      const sessionOp = !tableOp
        ? findSessionOperation(operationId)
        : null

      if (!tableOp && !sessionOp) {
        return HttpResponse.json<RevertOperationChangeResponse>(
          {
            status: "error",
            message: "Operación no encontrada.",
            revertedFields: 0,
          },
          { status: 404 }
        )
      }

      // Para operaciones de sesión, el "revert" en el mock se aplica al
      // cache vía `applySessionOperationRevert`. Para tablas, mutamos
      // `tableOperationChangesDb` igual que antes.
      let allChanges: ReturnType<typeof getSessionOperationChanges>
      let entityName: string
      let fieldIndexes: number[]

      if (tableOp) {
        allChanges =
          tableOperationChangesDb[slug]?.[operationId] ?? []
        entityName = tableOp.entityName
        const validIndexes = new Set(
          allChanges.map((change) => change.fieldIndex)
        )
        fieldIndexes = changes
          .filter((change) => validIndexes.has(change.fieldIndex))
          .map((change) => change.fieldIndex)
        if (fieldIndexes.length === 0) {
          return HttpResponse.json<RevertOperationChangeResponse>({
            status: "error",
            message: "No se especificaron campos válidos para revertir.",
            revertedFields: 0,
          })
        }
        fieldIndexes.forEach((fieldIndex) => {
          const target = allChanges.find(
            (change) => change.fieldIndex === fieldIndex
          )
          if (!target) return
          const reverted = target.before
          target.after = reverted
          target.current = reverted
        })
      } else {
        // sessionOp no es null acá (validado arriba)
        const session = auditsDb.find((row) =>
          row.id.startsWith(operationId.split("-op-")[0])
        )
        // Necesitamos la sesión para delegar al helper — si no la
        // encontramos caemos al 404.
        if (!session) {
          return HttpResponse.json<RevertOperationChangeResponse>({
            status: "error",
            message: "Operación no encontrada.",
            revertedFields: 0,
          })
        }
        const validIndexes = new Set(
          getSessionOperationChanges(sessionOp!).map(
            (change) => change.fieldIndex
          )
        )
        fieldIndexes = changes
          .filter((change) => validIndexes.has(change.fieldIndex))
          .map((change) => change.fieldIndex)
        if (fieldIndexes.length === 0) {
          return HttpResponse.json<RevertOperationChangeResponse>({
            status: "error",
            message: "No se especificaron campos válidos para revertir.",
            revertedFields: 0,
          })
        }
        applySessionOperationRevert(session, operationId, fieldIndexes)
        entityName = sessionOp!.entityName
      }

      return HttpResponse.json<RevertOperationChangeResponse>({
        status: "ok",
        message: `Se revirtieron ${fieldIndexes.length} campo(s) de "${entityName}".`,
        revertedFields: fieldIndexes.length,
      })
    }
  ),
]

import { http, HttpResponse, delay } from "msw"

import { auditTablesDb } from "../db/audit-tables"
import { tableOperationsDb } from "../db/table-operations"
import type {
  AuditTable,
  ExportFormat,
  ExportResult,
  TableOperation,
  TableOperationsQueryFilters,
  TableOperationsQueryRequest,
  TableOperationsQueryResponse,
  TableOperationsStats,
  TableOperationsStatsRequest,
} from "@/features/audits/api/types/audit-table"

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
      row.occurredAt < `${filters.occurredFrom}T00:00:00.000Z`
    ) {
      return false
    }
    if (
      filters.occurredTo &&
      row.occurredAt > `${filters.occurredTo}T23:59:59.999Z`
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

export const auditTablesHandlers = [
  http.get("/api/audit-tables", async () => {
    await delay(200)
    const tables: AuditTable[] = auditTablesDb.map((table) => ({
      ...table,
      operationsToday: getTableRows(table.slug).filter((row) =>
        isToday(row.occurredAt)
      ).length,
    }))
    return HttpResponse.json(tables)
  }),

  http.post(
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

  http.post(
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
]

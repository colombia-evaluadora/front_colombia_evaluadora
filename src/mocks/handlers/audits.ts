import { http, HttpResponse, delay } from "msw"

import { auditsDb } from "../db/audits"
import type {
  AuditSession,
  AuditsQueryRequest,
  AuditsQueryResponse,
  ExportFormat,
  ExportResult,
} from "@/features/audits/api/types/audit"

const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

function applyFilters(
  rows: AuditSession[],
  filters: AuditsQueryRequest["filters"]
): AuditSession[] {
  return rows.filter((row) => {
    if (filters.author) {
      const needle = filters.author.toLowerCase()
      const matches =
        row.authorName.toLowerCase().includes(needle) ||
        row.ip.toLowerCase().includes(needle)
      if (!matches) return false
    }
    if (filters.status?.length && !filters.status.includes(row.status)) {
      return false
    }
    if (filters.startedFrom && row.startedAt < `${filters.startedFrom}T00:00:00.000Z`) {
      return false
    }
    if (filters.startedTo && row.startedAt > `${filters.startedTo}T23:59:59.999Z`) {
      return false
    }
    return true
  })
}

function durationMs(row: AuditSession): number {
  const end = row.endedAt ? new Date(row.endedAt).getTime() : Date.now()
  return end - new Date(row.startedAt).getTime()
}

function sortValue(row: AuditSession, id: string) {
  if (id === "duration") return durationMs(row)
  if (id === "authorIp") return row.authorName
  return row[id as keyof AuditSession]
}

function applySorting(
  rows: AuditSession[],
  sorting: AuditsQueryRequest["sorting"]
): AuditSession[] {
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

export const auditsHandlers = [
  http.post("/api/audits/query", async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as AuditsQueryRequest
    const { filters, sorting, pageIndex, pageSize } = body

    const filtered = applySorting(applyFilters(auditsDb, filters), sorting)
    const totalCount = filtered.length
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = pageIndex * pageSize
    const rows = filtered.slice(start, start + pageSize)

    return HttpResponse.json<AuditsQueryResponse>({
      rows,
      pageCount,
      totalCount,
    })
  }),

  http.post("/api/audits/export", async ({ request }) => {
    await delay(600)
    const { ids, format } = (await request.json()) as {
      ids: string[]
      format: ExportFormat
    }

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${ids.length} sesión(es) exportada(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("/api/audits/export-all", async ({ request }) => {
    await delay(600)
    const { filters, format } = (await request.json()) as {
      filters: AuditsQueryRequest["filters"]
      format: ExportFormat
    }
    const count = applyFilters(auditsDb, filters).length

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${count} sesión(es) exportada(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),
]

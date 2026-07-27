import { http, HttpResponse, delay } from "msw"

import { getSessionOperations } from "./_session-operations"

import { auditsDb } from "../db/audits"
import type {
  AuditSession,
  AuditsQueryRequest,
  AuditsQueryResponse,
  AuditsStats,
  AuditsStatsRequest,
  ExportFormat,
  ExportResult,
  SessionOperation,
  SessionOperationsFilters,
  SessionOperationsQueryRequest,
  SessionOperationsResponse,
} from "@/features/audits/api/types/audit"

const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

// Los campos "desde/hasta" ahora vienen del picker de fecha+hora — el
// valor puede ser "yyyy-MM-dd" (fecha sola, formularios viejos o si el
// usuario nunca tocó el TimePicker) o "yyyy-MM-dd'T'HH:mm" (con hora).
// Antes esto se armaba concatenando `${value}T00:00:00.000Z` a mano, lo
// que rompía apenas el valor ya traía su propia "T" (quedaba con dos).
// `new Date(...).toISOString()` normaliza los dos casos sin ese bug.
function toComparableIso(value: string, boundary: "start" | "end"): string {
  const hasTime = value.includes("T")
  const iso = hasTime ? value : `${value}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}`
  return new Date(iso).toISOString()
}

function applyFilters(
  rows: AuditSession[],
  filters: AuditsQueryRequest["filters"],
): AuditSession[] {
  return rows.filter((row) => {
    if (filters.author) {
      const needle = filters.author.toLowerCase()
      const matches =
        row.authorName.toLowerCase().includes(needle) || row.ip.toLowerCase().includes(needle)
      if (!matches) return false
    }
    if (filters.status?.length && !filters.status.includes(row.status)) {
      return false
    }
    if (filters.startedFrom && row.startedAt < toComparableIso(filters.startedFrom, "start")) {
      return false
    }
    if (filters.startedTo && row.startedAt > toComparableIso(filters.startedTo, "end")) {
      return false
    }
    return true
  })
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

function computeStats(rows: AuditSession[]): AuditsStats {
  const todayRows = rows.filter((row) => isToday(row.startedAt))
  return {
    sessionsToday: todayRows.length,
    activeSessions: rows.filter((row) => row.status === "active").length,
    operationsToday: todayRows.reduce((sum, row) => sum + row.operationsCount, 0),
  }
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

function applySessionOperationFilters(
  rows: SessionOperation[],
  filters: SessionOperationsFilters,
): SessionOperation[] {
  return rows.filter((row) => {
    if (filters.tableSlug && row.tableSlug !== filters.tableSlug) return false
    if (filters.operations?.length && !filters.operations.includes(row.operation)) {
      return false
    }
    if (filters.occurredFrom && row.occurredAt < toComparableIso(filters.occurredFrom, "start")) {
      return false
    }
    if (filters.occurredTo && row.occurredAt > toComparableIso(filters.occurredTo, "end")) {
      return false
    }
    return true
  })
}

function sessionOperationSortValue(row: SessionOperation, id: string): string {
  return row[id as keyof SessionOperation] ?? ""
}

function applySortingSessionOps(
  rows: SessionOperation[],
  sorting: SessionOperationsQueryRequest["sorting"],
): SessionOperation[] {
  if (!sorting.length) return rows
  const [{ id, desc }] = sorting
  const sorted = [...rows].sort((a, b) => {
    const av = sessionOperationSortValue(a, id)
    const bv = sessionOperationSortValue(b, id)
    if (av === bv) return 0
    return av > bv ? 1 : -1
  })
  return desc ? sorted.reverse() : sorted
}

// Genera las operaciones de una sesión (delegado al módulo compartido
// `_session-operations` que cachea por sesión para que el listing y el
// dialog de "Ver cambios" vean los mismos datos).

function applySorting(
  rows: AuditSession[],
  sorting: AuditsQueryRequest["sorting"],
): AuditSession[] {
  if (!sorting.length) return rows
  const [{ id, desc }] = sorting
  const sorted = [...rows].sort((a, b) => {
    const av = sortValue(a, id)
    const bv = sortValue(b, id)
    if (av === bv) return 0
    if (av === null) return -1
    if (bv === null) return 1
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

  http.post("/api/audits/stats", async ({ request }) => {
    await delay(200)
    const { ids, filters } = (await request.json()) as AuditsStatsRequest
    const scoped = ids
      ? auditsDb.filter((row) => ids.includes(row.id))
      : applyFilters(auditsDb, filters ?? {})

    return HttpResponse.json<AuditsStats>(computeStats(scoped))
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

  // Lookup puntual de una sesión — la página de operaciones la usa para
  // el header (autor, IP, rango de fechas).
  http.get("/api/audits/sessions/:sessionId", async ({ params }) => {
    await delay(150)
    const sessionId = params.sessionId as string
    const session = auditsDb.find((row) => row.id === sessionId)
    if (!session) {
      return HttpResponse.json({ message: "Sesión no encontrada." }, { status: 404 })
    }
    return HttpResponse.json<AuditSession>(session)
  }),

  // QUERY paginada y filtrable. Las operaciones de una sesión se generan
  // on-the-fly (determinísticas por seed) y el filtrado/orden/paginación
  // se aplica en memoria antes de devolver la página.
  http.post("/api/audits/sessions/:sessionId/operations", async ({ request, params }) => {
    await delay(250)
    const sessionId = params.sessionId as string
    const session = auditsDb.find((row) => row.id === sessionId)
    if (!session) {
      return HttpResponse.json({ message: "Sesión no encontrada." }, { status: 404 })
    }

    const body = (await request.json()) as SessionOperationsQueryRequest
    const { filters, sorting, pageIndex, pageSize } = body

    const all = getSessionOperations(session)
    const filtered = applySortingSessionOps(applySessionOperationFilters(all, filters), sorting)
    const totalCount = filtered.length
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = pageIndex * pageSize
    const rows = filtered.slice(start, start + pageSize)

    return HttpResponse.json<SessionOperationsResponse>({
      rows,
      pageCount,
      totalCount,
    })
  }),

  // Exporta un subset de operaciones o todas las de la sesión (cuando
  // `ids` viene vacío).
  http.post("/api/audits/sessions/:sessionId/operations/export", async ({ request, params }) => {
    await delay(600)
    const sessionId = params.sessionId as string
    const session = auditsDb.find((row) => row.id === sessionId)
    const total = session?.operationsCount ?? 0

    const { ids, format } = (await request.json()) as {
      ids: string[]
      format: ExportFormat
    }

    // Sin `ids` ⇒ exportamos todas las operaciones de la sesión
    // (es lo que dispara el botón "Exportar todo" del top bar).
    const count = ids.length > 0 ? ids.length : total

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${count} operación(es) exportada(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),
]

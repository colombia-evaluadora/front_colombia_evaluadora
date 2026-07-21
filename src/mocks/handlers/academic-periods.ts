// src/features/academic-periods/api/mocks/academic-periods.handlers.ts

import { http, HttpResponse, delay } from "msw"
import { httpQuery } from "./_http-query"
import { academicPeriodsDb, sedesLookup } from "../db/academic-periods"
import type {
  AcademicPeriod,
  AcademicPeriodsQueryRequest,
  AcademicPeriodsQueryResponse,
  CreateAcademicPeriodRequest,
  ExportFormat,
  ExportResult,
} from "@/features/establishment/api/types/academic-period/academic-period"

const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

function applyFilters(
  rows: AcademicPeriod[],
  filters: AcademicPeriodsQueryRequest["filters"]
): AcademicPeriod[] {
  return rows.filter((row) => {
    if (
      filters.sedeName &&
      !row.sedeName.toLowerCase().includes(filters.sedeName.toLowerCase())
    ) {
      return false
    }
    if (filters.schoolYearId && row.schoolYearId !== filters.schoolYearId) {
      return false
    }
    if (filters.status?.length && !filters.status.includes(row.status)) {
      return false
    }
    return true
  })
}

function sortValue(row: AcademicPeriod, id: string) {
  return row[id as keyof AcademicPeriod]
}

function applySorting(
  rows: AcademicPeriod[],
  sorting: AcademicPeriodsQueryRequest["sorting"]
): AcademicPeriod[] {
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

export const academicPeriodsHandlers = [
  httpQuery("/api/academic-periods/query", async ({ request }) => {
    await delay(250)
    const body = (await request.json()) as AcademicPeriodsQueryRequest
    const { filters, sorting, pageIndex, pageSize } = body

    const filtered = applySorting(applyFilters(academicPeriodsDb, filters), sorting)
    const totalCount = filtered.length
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = pageIndex * pageSize
    const rows = filtered.slice(start, start + pageSize)

    return HttpResponse.json<AcademicPeriodsQueryResponse>({
      rows,
      pageCount,
      totalCount,
    })
  }),

  http.post("/api/academic-periods/export", async ({ request }) => {
    await delay(600)
    const { ids, format } = (await request.json()) as {
      ids: number[]
      format: ExportFormat
    }
    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${ids.length} periodo(s) exportado(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("/api/academic-periods/export-all", async ({ request }) => {
    await delay(600)
    const { filters, format } = (await request.json()) as {
      filters: AcademicPeriodsQueryRequest["filters"]
      format: ExportFormat
    }
    const count = applyFilters(academicPeriodsDb, filters).length
    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${count} periodo(s) exportado(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("/api/academic-periods", async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as CreateAcademicPeriodRequest
    const { config, ...periodData } = body
    const sede = sedesLookup.find((s) => s.id === periodData.sedeId)

    const newPeriod: AcademicPeriod = {
      id: academicPeriodsDb.length + 1,
      sedeName: sede?.name ?? "—",
      ...periodData,
    }
    academicPeriodsDb.push(newPeriod)

    return HttpResponse.json(newPeriod, { status: 201 })
  }),
]
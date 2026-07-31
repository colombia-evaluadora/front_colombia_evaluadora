import { http, HttpResponse, delay } from "msw"
import { teachersDb } from "../../db/academic-period/teachers"
import { academicPeriodsDb } from "../../db/academic-period/academic-periods"

import type {
  ExportFormat,
  ExportResult,
  Teacher,
  TeachersQueryRequest,
  TeachersQueryResponse,
} from "@/features/establishment/academic-period/api/types/teacher"

const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

function applyFilters(
  rows: Teacher[],
  filters: TeachersQueryRequest["filters"]
): Teacher[] {
  return rows.filter((row) => {
    if (
      filters.documento &&
      !row.documento.toLowerCase().includes(filters.documento.toLowerCase())
    ) {
      return false
    }
    if (
      filters.apellido &&
      !row.apellido.toLowerCase().includes(filters.apellido.toLowerCase())
    ) {
      return false
    }
    if (
      filters.nombre &&
      !row.nombre.toLowerCase().includes(filters.nombre.toLowerCase())
    ) {
      return false
    }
    if (filters.estado?.length && !filters.estado.includes(row.estado)) {
      return false
    }
    return true
  })
}

function applySorting(
  rows: Teacher[],
  sorting: TeachersQueryRequest["sorting"]
): Teacher[] {
  if (!sorting.length) return rows
  const [{ id, desc }] = sorting
  const sorted = [...rows].sort((a, b) =>
    String(a[id as keyof Teacher]).localeCompare(String(b[id as keyof Teacher]))
  )
  return desc ? sorted.reverse() : sorted
}

export const teachersHandlers = [
  http.post("/api/teachers/query", async ({ request }) => {
    await delay(250)

    const body = (await request.json()) as TeachersQueryRequest
    const { filters, sorting, pageIndex, pageSize, academicPeriodId } = body

    // Los docentes se agrupan por sede: resolvemos la sede del periodo pedido
    // y devolvemos sus docentes. Así un periodo nuevo de una sede con docentes
    // ya los muestra. Sin periodo (null) devolvemos todos.
    const period =
      academicPeriodId == null
        ? undefined
        : academicPeriodsDb.find((p) => p.id === academicPeriodId)

    const scoped =
      academicPeriodId == null
        ? teachersDb
        : period
          ? teachersDb.filter((row) => row.sedeId === period.sedeId)
          : []

    const filtered = applySorting(applyFilters(scoped, filters), sorting)

    const totalCount = filtered.length
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = pageIndex * pageSize
    const rows = filtered.slice(start, start + pageSize)

    return HttpResponse.json<TeachersQueryResponse>({
      rows,
      pageCount,
      totalCount,
    })
  }),

  http.post("/api/teachers/export-all", async ({ request }) => {
    await delay(600)
    const { filters, format } = (await request.json()) as {
      filters: TeachersQueryRequest["filters"]
      format: ExportFormat
    }
    const count = applyFilters(teachersDb, filters).length
    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${count} docente(s) exportado(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),
]

import { HttpResponse, delay } from "msw"
import { httpQuery } from "./_http-query"
import { teachersDb } from "../db/teachers"

import type {
  Teacher,
  TeachersQueryRequest,
  TeachersQueryResponse,
} from "@/features/establishment/api/types/academic-period/teacher"

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
  httpQuery("/api/teachers/query", async ({ request }) => {
    await delay(250)

    const body = (await request.json()) as TeachersQueryRequest
    const { filters, sorting, pageIndex, pageSize } = body

    const filtered = applySorting(applyFilters(teachersDb, filters), sorting)

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
]

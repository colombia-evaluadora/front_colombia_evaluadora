import { HttpResponse, delay } from "msw"
import { httpQuery } from "./_http-query"
import { gradesDb } from "../db/grades"

import type {
  Grade,
  GradesQueryRequest,
  GradesQueryResponse,
} from "@/features/establishment/api/types/academic-period/grade"

function applyFilters(
  rows: Grade[],
  filters: GradesQueryRequest["filters"]
): Grade[] {
  return rows.filter((row) => {
    if (
      filters.nombre &&
      !row.nombre.toLowerCase().includes(filters.nombre.toLowerCase())
    ) {
      return false
    }

    if (
      filters.grado &&
      !row.grado.toLowerCase().includes(filters.grado.toLowerCase())
    ) {
      return false
    }

    if (
      filters.teachingLevelIds?.length &&
      !filters.teachingLevelIds.includes(row.teachingLevelId)
    ) {
      return false
    }

    return true
  })
}

function sortValue(row: Grade, id: string) {
  return row[id as keyof Grade]
}

function applySorting(
  rows: Grade[],
  sorting: GradesQueryRequest["sorting"]
): Grade[] {
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

export const gradesHandlers = [
  httpQuery("/api/grades/query", async ({ request }) => {
    await delay(250)

    const body = (await request.json()) as GradesQueryRequest
    const { filters, sorting, pageIndex, pageSize } = body

    const filtered = applySorting(applyFilters(gradesDb, filters), sorting)

    const totalCount = filtered.length
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = pageIndex * pageSize

    const rows = filtered.slice(start, start + pageSize)

    return HttpResponse.json<GradesQueryResponse>({
      rows,
      pageCount,
      totalCount,
    })
  }),
]

import { http, HttpResponse, delay } from "msw"
import { httpQuery } from "./_http-query"
import { gradeGroupsDb } from "../db/grade-groups"

import type {
  GradeGroup,
  GradeGroupsQueryRequest,
  GradeGroupsQueryResponse,
  CreateGradeGroupRequest,
} from "@/features/establishment/api/types/academic-period/grade-group"

function applyFilters(
  rows: GradeGroup[],
  filters: GradeGroupsQueryRequest["filters"]
): GradeGroup[] {
  return rows.filter((row) => {
    if (
      filters.codigo &&
      !row.codigo.toLowerCase().includes(filters.codigo.toLowerCase())
    ) {
      return false
    }
    if (
      filters.jornada &&
      !row.jornada.toLowerCase().includes(filters.jornada.toLowerCase())
    ) {
      return false
    }
    if (
      filters.director &&
      !row.director.toLowerCase().includes(filters.director.toLowerCase())
    ) {
      return false
    }
    if (
      filters.planEstudio &&
      !row.planEstudio.toLowerCase().includes(filters.planEstudio.toLowerCase())
    ) {
      return false
    }
    return true
  })
}

function applySorting(
  rows: GradeGroup[],
  sorting: GradeGroupsQueryRequest["sorting"]
): GradeGroup[] {
  if (!sorting.length) return rows
  const [{ id, desc }] = sorting
  const sorted = [...rows].sort((a, b) => {
    const av = String(a[id as keyof GradeGroup])
    const bv = String(b[id as keyof GradeGroup])
    return av.localeCompare(bv)
  })
  return desc ? sorted.reverse() : sorted
}

export const gradeGroupsHandlers = [
  httpQuery("/api/grade-groups/query", async ({ request }) => {
    await delay(250)

    const body = (await request.json()) as GradeGroupsQueryRequest
    const { filters, sorting, pageIndex, pageSize, gradeId } = body

    const scoped =
      gradeId == null
        ? gradeGroupsDb
        : gradeGroupsDb.filter((row) => row.gradeId === gradeId)

    const filtered = applySorting(applyFilters(scoped, filters), sorting)

    const totalCount = filtered.length
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = pageIndex * pageSize
    const rows = filtered.slice(start, start + pageSize)

    return HttpResponse.json<GradeGroupsQueryResponse>({
      rows,
      pageCount,
      totalCount,
    })
  }),

  http.post("/api/grade-groups", async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as CreateGradeGroupRequest
    const record = { ...body, gradeId: body.gradeId ?? 0 }
    gradeGroupsDb.push(record)
    return HttpResponse.json(record, { status: 201 })
  }),
]

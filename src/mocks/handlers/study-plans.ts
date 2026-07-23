import { http, HttpResponse, delay } from "msw"
import { httpQuery } from "./_http-query"
import { studyPlansDb } from "../db/study-plans"

import type {
  StudyPlanItem,
  StudyPlanQueryRequest,
  StudyPlanQueryResponse,
  CreateStudyPlanItemRequest,
} from "@/features/establishment/api/types/academic-period/study-plan"

function applyFilters(
  rows: StudyPlanItem[],
  filters: StudyPlanQueryRequest["filters"]
): StudyPlanItem[] {
  return rows.filter((row) => {
    if (
      filters.asignatura &&
      !row.asignatura.toLowerCase().includes(filters.asignatura.toLowerCase())
    ) {
      return false
    }
    return true
  })
}

function sortValue(row: StudyPlanItem, id: string): string | number {
  const value = row[id as keyof StudyPlanItem]
  if (typeof value === "boolean") return value ? 1 : 0
  return value ?? ""
}

function applySorting(
  rows: StudyPlanItem[],
  sorting: StudyPlanQueryRequest["sorting"]
): StudyPlanItem[] {
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

export const studyPlansHandlers = [
  httpQuery("/api/study-plans/query", async ({ request }) => {
    await delay(250)

    const body = (await request.json()) as StudyPlanQueryRequest
    const { filters, sorting, pageIndex, pageSize } = body

    const filtered = applySorting(applyFilters(studyPlansDb, filters), sorting)

    const totalCount = filtered.length
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = pageIndex * pageSize
    const rows = filtered.slice(start, start + pageSize)

    return HttpResponse.json<StudyPlanQueryResponse>({
      rows,
      pageCount,
      totalCount,
    })
  }),

  http.post("/api/study-plans", async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as CreateStudyPlanItemRequest
    studyPlansDb.push(body)
    return HttpResponse.json(body, { status: 201 })
  }),
]

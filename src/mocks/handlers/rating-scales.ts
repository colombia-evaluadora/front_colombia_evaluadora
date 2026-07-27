import { http, HttpResponse, delay } from "msw"

import { httpQuery } from "./_http-query"
import {
  ratingScalesDb,
  teachingLevelsDb,
  resolveTeachingLevels,
  nextRatingScaleId,
} from "../db/rating-scales"
import { ratingSymbolsDb } from "../db/rating-symbols"
import type {
  RatingScale,
  RatingScaleRecord,
  RatingScalesQueryFilters,
  RatingScalesQueryRequest,
  RatingScalesQueryResponse,
  CreateRatingScaleRequest,
  RatingSymbol,
  TeachingLevel,
} from "@/features/establishment/api/types/academic-period/rating-scales"

function applyFilters(
  rows: RatingScale[],
  filters: RatingScalesQueryFilters
): RatingScale[] {
  return rows.filter((row) => {
    if (
      filters.nombre &&
      !row.nombre.toLowerCase().includes(filters.nombre.toLowerCase())
    ) {
      return false
    }
    if (
      filters.abreviacion &&
      !row.abreviacion.toLowerCase().includes(filters.abreviacion.toLowerCase())
    ) {
      return false
    }
    if (filters.tipo?.length && !filters.tipo.includes(row.tipo)) {
      return false
    }
    return true
  })
}

function sortValue(row: RatingScale, id: string) {
  return row[id as keyof RatingScale] as string | number
}

function applySorting(
  rows: RatingScale[],
  sorting: RatingScalesQueryRequest["sorting"]
): RatingScale[] {
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

export const ratingScalesHandlers = [
  http.get("/api/teaching-levels", async () => {
    await delay(150)
    return HttpResponse.json<TeachingLevel[]>(teachingLevelsDb)
  }),

  http.get("/api/rating-symbols", async () => {
    await delay(150)
    return HttpResponse.json<RatingSymbol[]>(ratingSymbolsDb)
  }),

  httpQuery("/api/rating-scales/query", async ({ request }) => {
    await delay(250)
    const { filters, sorting, pageIndex, pageSize, academicPeriodId } =
      (await request.json()) as RatingScalesQueryRequest

    const scoped =
      academicPeriodId == null
        ? ratingScalesDb
        : ratingScalesDb.filter(
            (row) => row.academicPeriodId === academicPeriodId
          )

    const filtered = applySorting(applyFilters(scoped, filters), sorting)
    const totalCount = filtered.length
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = pageIndex * pageSize
    const rows = filtered.slice(start, start + pageSize)

    return HttpResponse.json<RatingScalesQueryResponse>({
      rows,
      pageCount,
      totalCount,
    })
  }),

  http.post("/api/rating-scales", async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as CreateRatingScaleRequest

    const newScale: RatingScaleRecord = {
      ...body,
      codigo: nextRatingScaleId(),
      teachingLevels: resolveTeachingLevels(body.teachingLevelIds),
      academicPeriodId: body.academicPeriodId ?? 0,
    }
    ratingScalesDb.push(newScale)

    return HttpResponse.json(newScale, { status: 201 })
  }),
]

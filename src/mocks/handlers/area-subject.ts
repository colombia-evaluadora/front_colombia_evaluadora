// src/features/area-subjects/api/mocks/area-subjects.handlers.ts

import { http, HttpResponse, delay } from "msw"
import { httpQuery } from "./_http-query"
import { areaSubjectsDb } from "../db/area-subject"

import type {
  AreaSubject,
  AreaSubjectsQueryRequest,
  AreaSubjectsQueryResponse,
  CreateAreaSubjectRequest,
  ExportFormat,
  ExportResult,
} from "@/features/establishment/api/types/academic-period/area-subject"

const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

function applyFilters(
  rows: AreaSubject[],
  filters: AreaSubjectsQueryRequest["filters"]
): AreaSubject[] {
  return rows.filter((row) => {
    if (
      filters.areaGeneral &&
      !row.areaGeneral
        .toLowerCase()
        .includes(filters.areaGeneral.toLowerCase())
    ) {
      return false
    }

    if (
      filters.nombreInterno &&
      !row.nombreInterno
        .toLowerCase()
        .includes(filters.nombreInterno.toLowerCase())
    ) {
      return false
    }

    if (
      filters.abreviacion &&
      !row.abreviacion
        .toLowerCase()
        .includes(filters.abreviacion.toLowerCase())
    ) {
      return false
    }

    return true
  })
}

function sortValue(row: AreaSubject, id: string): string | number {
  return row[id as keyof AreaSubject] ?? ""
}

function applySorting(
  rows: AreaSubject[],
  sorting: AreaSubjectsQueryRequest["sorting"]
): AreaSubject[] {
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

export const areaSubjectsHandlers = [
  httpQuery("/api/area-subjects/query", async ({ request }) => {
    await delay(250)

    const body = (await request.json()) as AreaSubjectsQueryRequest
    const { filters, sorting, pageIndex, pageSize, academicPeriodId } = body

    const scoped =
      academicPeriodId == null
        ? areaSubjectsDb
        : areaSubjectsDb.filter(
            (row) => row.academicPeriodId === academicPeriodId
          )

    const filtered = applySorting(applyFilters(scoped, filters), sorting)

    const totalCount = filtered.length
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = pageIndex * pageSize

    const rows = filtered.slice(start, start + pageSize)

    return HttpResponse.json<AreaSubjectsQueryResponse>({
      rows,
      pageCount,
      totalCount,
    })
  }),

  http.post("/api/area-subjects/export", async ({ request }) => {
    await delay(600)

    const { ids, format } = (await request.json()) as {
      ids: number[]
      format: ExportFormat
    }

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${ids.length} área(s) exportada(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("/api/area-subjects/export-all", async ({ request }) => {
    await delay(600)

    const { filters, format } = (await request.json()) as {
      filters: AreaSubjectsQueryRequest["filters"]
      format: ExportFormat
    }

    const count = applyFilters(areaSubjectsDb, filters).length

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${count} área(s) exportada(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("/api/area-subjects", async ({ request }) => {
    await delay(400)

    const body = (await request.json()) as CreateAreaSubjectRequest

    const record = { ...body, academicPeriodId: body.academicPeriodId ?? 0 }
    areaSubjectsDb.push(record)

    return HttpResponse.json(record, { status: 201 })
  }),

  http.delete("/api/area-subjects/:codigo", async ({ params }) => {
    await delay(300)
    const index = areaSubjectsDb.findIndex(
      (row) => String(row.codigo) === String(params.codigo)
    )
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Área/asignatura no encontrada." },
        { status: 404 }
      )
    }
    areaSubjectsDb.splice(index, 1)
    return HttpResponse.json({
      status: "ok",
      message: "Área/asignatura eliminada.",
    })
  }),
]
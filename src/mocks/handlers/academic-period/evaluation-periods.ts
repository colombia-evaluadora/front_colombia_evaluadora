// src/features/evaluation-periods/api/mocks/evaluation-periods.handlers.ts

import { http, HttpResponse, delay } from "msw"
import { evaluationPeriodsDb } from "@/mocks/db/academic-period/evaluation-periods"

import type {
  EvaluationPeriod,
  EvaluationPeriodsQueryRequest,
  EvaluationPeriodsQueryResponse,
  CreateEvaluationPeriodRequest,
  UpdateEvaluationPeriodRequest,
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/evaluation-period"

const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

function applyFilters(
  rows: EvaluationPeriod[],
  filters: EvaluationPeriodsQueryRequest["filters"]
): EvaluationPeriod[] {
  return rows.filter((row) => {
    if (
      filters.nombre &&
      !row.nombre.toLowerCase().includes(filters.nombre.toLowerCase())
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

    if (filters.estado?.length && !filters.estado.includes(row.estado)) {
      return false
    }

    return true
  })
}

function sortValue(row: EvaluationPeriod, id: string) {
  return row[id as keyof EvaluationPeriod]
}

function applySorting(
  rows: EvaluationPeriod[],
  sorting: EvaluationPeriodsQueryRequest["sorting"]
): EvaluationPeriod[] {
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

export const evaluationPeriodsHandlers = [
  http.post("/api/evaluation-periods/query", async ({ request }) => {
    await delay(250)

    const body = (await request.json()) as EvaluationPeriodsQueryRequest
    const { filters, sorting, pageIndex, pageSize, academicPeriodId } = body

    const scoped =
      academicPeriodId == null
        ? evaluationPeriodsDb
        : evaluationPeriodsDb.filter(
            (row) => row.academicPeriodId === academicPeriodId
          )

    const filtered = applySorting(applyFilters(scoped, filters), sorting)

    const totalCount = filtered.length
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = pageIndex * pageSize

    const rows = filtered.slice(start, start + pageSize)

    return HttpResponse.json<EvaluationPeriodsQueryResponse>({
      rows,
      pageCount,
      totalCount,
    })
  }),

  http.post("/api/evaluation-periods/export", async ({ request }) => {
    await delay(600)

    const { ids, format } = (await request.json()) as {
      ids: number[]
      format: ExportFormat
    }

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${ids.length} periodo(s) de evaluación exportado(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("/api/evaluation-periods/export-all", async ({ request }) => {
    await delay(600)

    const { filters, format } = (await request.json()) as {
      filters: EvaluationPeriodsQueryRequest["filters"]
      format: ExportFormat
    }

    const count = applyFilters(evaluationPeriodsDb, filters).length

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${count} periodo(s) de evaluación exportado(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("/api/evaluation-periods", async ({ request }) => {
    await delay(400)

    const body = (await request.json()) as CreateEvaluationPeriodRequest

    const record = { ...body, academicPeriodId: body.academicPeriodId ?? 0 }
    evaluationPeriodsDb.push(record)

    return HttpResponse.json(record, { status: 201 })
  }),

  // Borrado en lote por códigos (atómico, una sola request). A diferencia del
  // borrado individual, el front no manda `academicPeriodId`, así que el match
  // es sólo por código.
  http.post("/api/evaluation-periods/bulk-delete", async ({ request }) => {
    await delay(300)
    const { ids } = (await request.json()) as { ids: number[] }
    const set = new Set(ids.map(String))
    const before = evaluationPeriodsDb.length
    for (let i = evaluationPeriodsDb.length - 1; i >= 0; i--) {
      if (set.has(String(evaluationPeriodsDb[i].codigo))) {
        evaluationPeriodsDb.splice(i, 1)
      }
    }
    return HttpResponse.json({
      status: "ok",
      message: "Periodos de evaluación eliminados.",
      deleted: before - evaluationPeriodsDb.length,
    })
  }),

  http.patch("/api/evaluation-periods/:codigo", async ({ request, params }) => {
    await delay(400)
    const body = (await request.json()) as UpdateEvaluationPeriodRequest
    // El código no es único globalmente: se desambigua por academicPeriodId
    // para no editar el registro homónimo de otro periodo académico.
    const index = evaluationPeriodsDb.findIndex(
      (p) =>
        String(p.codigo) === String(params.codigo) &&
        (body.academicPeriodId == null ||
          p.academicPeriodId === body.academicPeriodId)
    )
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Periodo de evaluación no encontrado." },
        { status: 404 }
      )
    }
    evaluationPeriodsDb[index] = { ...evaluationPeriodsDb[index], ...body }
    return HttpResponse.json({
      status: "ok",
      message: "Periodo de evaluación actualizado.",
    })
  }),

  http.delete("/api/evaluation-periods/:codigo", async ({ params, request }) => {
    await delay(300)
    const url = new URL(request.url)
    const academicPeriodId = url.searchParams.get("academicPeriodId")
    // Mismo motivo que el PATCH: el código se desambigua por academicPeriodId.
    const index = evaluationPeriodsDb.findIndex(
      (p) =>
        String(p.codigo) === String(params.codigo) &&
        (academicPeriodId == null ||
          p.academicPeriodId === Number(academicPeriodId))
    )
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Periodo de evaluación no encontrado." },
        { status: 404 }
      )
    }
    evaluationPeriodsDb.splice(index, 1)
    return HttpResponse.json({
      status: "ok",
      message: "Periodo de evaluación eliminado.",
    })
  }),
]
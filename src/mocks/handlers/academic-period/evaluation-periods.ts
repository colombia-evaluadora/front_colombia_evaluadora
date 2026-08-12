// src/features/evaluation-periods/api/mocks/evaluation-periods.handlers.ts

import { http, HttpResponse, delay } from "msw"
import { evaluationPeriodsDb } from "../../db/academic-period/evaluation-periods"
import { evaluationPeriodStatusesDb } from "../../db/academic-period/evaluation-period-statuses"

import type {
  EvaluationPeriod,
  EvaluationPeriodRecord,
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
  return row[id as keyof EvaluationPeriod] ?? ""
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

    // El backend resuelve el nombre del estado (TLISTA_VALOR.NOMBRE); el mock
    // lo espeja del valor.
    const rows = filtered
      .slice(start, start + pageSize)
      .map((row) => ({ ...row, estadoName: row.estado }))

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
    const { estadoId, ...rest } = body
    // El back guarda el estado por id; resolvemos el código/etiqueta para el listado.
    const statusOption = evaluationPeriodStatusesDb.find((s) => s.id === estadoId)

    // El PK lo asigna el backend (identity); el mock lo autoincrementa.
    const id =
      evaluationPeriodsDb.reduce((max, p) => Math.max(max, p.id), 0) + 1
    const record: EvaluationPeriodRecord = {
      ...rest,
      id,
      estado: statusOption?.key ?? "NO Calificable",
      estadoId,
      estadoName: statusOption?.label,
      academicPeriodId: body.academicPeriodId ?? 0,
    }
    evaluationPeriodsDb.push(record)

    return HttpResponse.json(record, { status: 201 })
  }),

  // Borrado en lote por PK (atómico, una sola request).
  http.post("/api/evaluation-periods/bulk-delete", async ({ request }) => {
    await delay(300)
    const { ids } = (await request.json()) as { ids: number[] }
    const set = new Set(ids.map(String))
    const before = evaluationPeriodsDb.length
    for (let i = evaluationPeriodsDb.length - 1; i >= 0; i--) {
      if (set.has(String(evaluationPeriodsDb[i].id))) {
        evaluationPeriodsDb.splice(i, 1)
      }
    }
    return HttpResponse.json({
      status: "ok",
      message: "Periodos de evaluación eliminados.",
      deleted: before - evaluationPeriodsDb.length,
    })
  }),

  http.patch("/api/evaluation-periods/:id", async ({ request, params }) => {
    await delay(400)
    const body = (await request.json()) as UpdateEvaluationPeriodRequest
    // Match por PK (único); ya no hace falta desambiguar por academicPeriodId.
    const index = evaluationPeriodsDb.findIndex(
      (p) => String(p.id) === String(params.id)
    )
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Periodo de evaluación no encontrado." },
        { status: 404 }
      )
    }
    const { estadoId, ...rest } = body
    const statusOption = evaluationPeriodStatusesDb.find((s) => s.id === estadoId)
    evaluationPeriodsDb[index] = {
      ...evaluationPeriodsDb[index],
      ...rest,
      estado: statusOption?.key ?? evaluationPeriodsDb[index].estado,
      estadoId,
      estadoName: statusOption?.label ?? evaluationPeriodsDb[index].estadoName,
    }
    return HttpResponse.json({
      status: "ok",
      message: "Periodo de evaluación actualizado.",
    })
  }),

  http.delete("/api/evaluation-periods/:id", async ({ params }) => {
    await delay(300)
    // Match por PK (único).
    const index = evaluationPeriodsDb.findIndex(
      (p) => String(p.id) === String(params.id)
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
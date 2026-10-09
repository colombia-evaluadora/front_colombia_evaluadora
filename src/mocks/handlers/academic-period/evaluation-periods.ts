// src/features/evaluation-periods/api/mocks/evaluation-periods.handlers.ts

import { http, HttpResponse, delay } from "msw"
import { evaluationPeriodStatusesDb } from "../../db/academic-period/evaluation-period-statuses"
import { evaluationPeriodsDb } from "@/mocks/db/academic-period/evaluation-periods"
import { evaluationPeriodStatusByDates } from "@/features/establishment/academic-period/api/ui-mappings"
import { formatDateValue } from "@/lib/date-value"

import type {
  EvaluationPeriod,
  EvaluationPeriodRecord,
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/evaluation-period"

const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

interface EvaluationPeriodWriteBody {
  FK_PERIODO?: number
  CODIGO: string
  NOMBRE: string
  ABREVIACION: string
  FECHA_INICIO: string
  FECHA_FIN: string
  PORCENTAJE: number
}

function toRawRow(
  row: EvaluationPeriod & { academicPeriodId?: number },
  totalCount?: number
) {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    abreviacion: row.abreviacion,
    start_date: row.startDate,
    end_date: row.endDate,
    peso: row.peso,
    status_id: row.estadoId ?? null,
    estado: row.estado,
    estado_name: row.estadoName ?? row.estado,
    academic_period_id: row.academicPeriodId ?? 0,
    ...(totalCount != null ? { total_count: totalCount } : {}),
  }
}

function applyFiltro(rows: EvaluationPeriod[], filtro: string | null | undefined) {
  if (!filtro) return rows
  const needle = filtro.toLowerCase()
  return rows.filter(
    (row) =>
      row.nombre.toLowerCase().includes(needle) ||
      row.abreviacion.toLowerCase().includes(needle)
  )
}

function applySort(
  rows: EvaluationPeriod[],
  sortBy: string | null,
  sortDir: "asc" | "desc" | null
) {
  if (!sortBy) return rows
  const sorted = [...rows].sort((a, b) => {
    const av = a[sortBy as keyof EvaluationPeriod]
    const bv = b[sortBy as keyof EvaluationPeriod]
    if (av === bv) return 0
    if (av == null) return -1
    if (bv == null) return 1
    return av > bv ? 1 : -1
  })
  return sortDir === "desc" ? sorted.reverse() : sorted
}

export const evaluationPeriodsHandlers = [
  http.post("/api/eval-col/periodo-evaluacion/query", async ({ request }) => {
    await delay(250)

    const body = (await request.json()) as {
      FK_PERIODO: number | null
      FILTRO: string | null
      PAGEINDEX: number
      PAGESIZE: number
      SORT_BY: string | null
      SORT_DIR: "asc" | "desc" | null
    }

    const scoped =
      body.FK_PERIODO == null
        ? evaluationPeriodsDb
        : evaluationPeriodsDb.filter(
            (row) => row.academicPeriodId === body.FK_PERIODO
          )

    const filtered = applySort(
      applyFiltro(scoped, body.FILTRO),
      body.SORT_BY,
      body.SORT_DIR
    )
    const totalCount = filtered.length
    const start = body.PAGEINDEX * body.PAGESIZE

    const rows = filtered
      .slice(start, start + body.PAGESIZE)
      .map((row) => toRawRow(row, totalCount))

    return HttpResponse.json({ rows })
  }),

  http.get("/api/eval-col/periodo-evaluacion/detalle/:id", async ({ params }) => {
    await delay(200)
    const row = evaluationPeriodsDb.find(
      (p) => String(p.id) === String(params.id)
    )
    if (!row) {
      return HttpResponse.json(
        { status: "error", message: "Periodo de evaluación no encontrado." },
        { status: 404 }
      )
    }
    return HttpResponse.json({ rows: [toRawRow(row)] })
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
      filters: { filtro?: string }
      format: ExportFormat
    }

    const count = applyFiltro(evaluationPeriodsDb, filters.filtro).length

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${count} periodo(s) de evaluación exportado(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("/api/eval-col/periodo-evaluacion", async ({ request }) => {
    await delay(400)

    const body = (await request.json()) as EvaluationPeriodWriteBody
    const estado = evaluationPeriodStatusByDates(
      body.FECHA_INICIO,
      body.FECHA_FIN,
      formatDateValue(new Date())
    )
    const statusOption = evaluationPeriodStatusesDb.find((s) => s.key === estado)
    const id =
      evaluationPeriodsDb.reduce((max, p) => Math.max(max, p.id), 0) + 1
    const record: EvaluationPeriodRecord = {
      id,
      codigo: body.CODIGO,
      nombre: body.NOMBRE,
      abreviacion: body.ABREVIACION,
      startDate: body.FECHA_INICIO,
      endDate: body.FECHA_FIN,
      peso: body.PORCENTAJE,
      estado,
      estadoId: statusOption?.id,
      estadoName: statusOption?.label,
      academicPeriodId: body.FK_PERIODO ?? 0,
    }
    evaluationPeriodsDb.push(record)

    return HttpResponse.json({ rows: [{ fn_periodo_eval_crear: id }] })
  }),

  http.post("/api/eval-col/periodo-evaluacion/bulk-delete", async ({ request }) => {
    await delay(300)
    const { IDS } = (await request.json()) as { IDS: number[] }
    const set = new Set(IDS.map(String))
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

  http.put("/api/eval-col/periodo-evaluacion/editar/:id", async ({ request, params }) => {
    await delay(400)
    const body = (await request.json()) as Omit<EvaluationPeriodWriteBody, "FK_PERIODO">
    const index = evaluationPeriodsDb.findIndex(
      (p) => String(p.id) === String(params.id)
    )
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Periodo de evaluación no encontrado." },
        { status: 404 }
      )
    }
    evaluationPeriodsDb[index] = {
      ...evaluationPeriodsDb[index],
      codigo: body.CODIGO,
      nombre: body.NOMBRE,
      abreviacion: body.ABREVIACION,
      startDate: body.FECHA_INICIO,
      endDate: body.FECHA_FIN,
      peso: body.PORCENTAJE,
    }
    return HttpResponse.json({
      rows: [{ fn_periodo_eval_actualizar: evaluationPeriodsDb[index].id }],
    })
  }),

  http.put("/api/eval-col/periodo-evaluacion/:id", async ({ params }) => {
    await delay(300)
    const index = evaluationPeriodsDb.findIndex(
      (p) => String(p.id) === String(params.id)
    )
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Periodo de evaluación no encontrado." },
        { status: 404 }
      )
    }
    const [deleted] = evaluationPeriodsDb.splice(index, 1)
    return HttpResponse.json({
      rows: [{ fn_periodo_eval_soft_delete: deleted.id }],
    })
  }),
]

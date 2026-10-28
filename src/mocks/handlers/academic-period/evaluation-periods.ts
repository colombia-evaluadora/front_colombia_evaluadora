// src/features/evaluation-periods/api/mocks/evaluation-periods.handlers.ts

import { http, HttpResponse, delay } from "msw"
import { evaluationPeriodStatusesDb } from "../../db/academic-period/evaluation-period-statuses"
import { evaluationPeriodsDb } from "@/mocks/db/academic-period/evaluation-periods"
import { evaluationPeriodStatusByDates } from "@/features/establishment/academic-period/api/ui-mappings"
import { formatDateValue } from "@/lib/date-value"
import { academicPeriodsDb } from "@/mocks/db/academic-period/academic-periods"

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

// Reglas 30, 34, 35 y 36 tal como las aplicaría `fn_periodo_eval_crear/actualizar`.
function validateEvaluationPeriod(
  body: EvaluationPeriodWriteBody,
  academicPeriodId: number,
  excludeId: number | null
): string | null {
  const { FECHA_INICIO: start, FECHA_FIN: end } = body
  if (end <= start) return "La Fecha fin debe ser posterior a la Fecha inicio."
  const period = academicPeriodsDb.find((p) => p.id === academicPeriodId)
  const siblings = evaluationPeriodsDb.filter(
    (p) => p.academicPeriodId === academicPeriodId && p.id !== excludeId
  )
  if (period) {
    if (start < period.startDate) {
      return "El primer período de evaluación no puede empezar antes del Inicio del período académico."
    }
    if (end > period.endDate) {
      return "Las fechas deben estar dentro del período académico."
    }
  }
  const crossed = siblings.find((p) => start <= p.endDate && p.startDate <= end)
  if (crossed) return `Las fechas se cruzan con el período de evaluación ${crossed.nombre}.`
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
  if (siblings.some((p) => same(p.nombre, body.NOMBRE))) {
    return "Ya existe un período de evaluación con ese Nombre."
  }
  if (siblings.some((p) => same(p.abreviacion, body.ABREVIACION))) {
    return "Ya existe un período de evaluación con esa Abreviación."
  }
  const total = siblings.reduce((sum, p) => sum + (p.peso ?? 0), 0) + (body.PORCENTAJE ?? 0)
  if (total > 100) return "La suma de los pesos no puede superar el 100 %."
  return null
}

function validationError(message: string) {
  return HttpResponse.json({ status: "error", message }, { status: 409 })
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
    const error = validateEvaluationPeriod(body, body.FK_PERIODO ?? 0, null)
    if (error) return validationError(error)
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
    const current = evaluationPeriodsDb[index]
    const error = validateEvaluationPeriod(body, current.academicPeriodId ?? 0, current.id)
    if (error) return validationError(error)
    const estado = evaluationPeriodStatusByDates(
      body.FECHA_INICIO,
      body.FECHA_FIN,
      formatDateValue(new Date())
    )
    const statusOption = evaluationPeriodStatusesDb.find((s) => s.key === estado)
    evaluationPeriodsDb[index] = {
      ...current,
      estado,
      estadoId: statusOption?.id,
      estadoName: statusOption?.label,
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

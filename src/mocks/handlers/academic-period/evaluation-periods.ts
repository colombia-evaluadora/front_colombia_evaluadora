// src/features/evaluation-periods/api/mocks/evaluation-periods.handlers.ts

import { http, HttpResponse, delay } from "msw"
import { evaluationPeriodStatusesDb } from "../../db/academic-period/evaluation-period-statuses"
import { evaluationPeriodsDb } from "@/mocks/db/academic-period/evaluation-periods"

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

// Body plano UPPER_SNAKE que manda el front real para crear/editar
// (`fn_periodo_eval_crear` / `fn_periodo_eval_actualizar`).
interface EvaluationPeriodWriteBody {
  FK_PERIODO?: number
  CODIGO: number
  NOMBRE: string
  ABREVIACION: string
  FECHA_INICIO: string
  FECHA_FIN: string
  FK_ESTADO: number
  PORCENTAJE: number
}

// Fila cruda (snake_case + total_count) que devuelve `/periodo-evaluacion/query`
// y `/periodo-evaluacion/detalle/:id`.
function toRawRow(row: EvaluationPeriod, totalCount: number) {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    abreviacion: row.abreviacion,
    fecha_inicio: row.startDate,
    fecha_fin: row.endDate,
    fk_estado: row.estadoId ?? null,
    estado: row.estado,
    estado_name: row.estadoName ?? row.estado,
    porcentaje: row.peso,
    total_count: totalCount,
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

// Mismo patrón que `academic-periods.ts`: `SORT_BY` todavía no existe en el
// signature real de `fn_periodo_eval_listar`, pero se va a agregar — el mock
// ya lo aplica para no tener que tocarlo de nuevo cuando esté.
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

    // Mismo shape crudo que el endpoint real (snake_case + `total_count` por
    // fila, sin envelope); el front lo mapea/envuelve.
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
    return HttpResponse.json(toRawRow(row, 1))
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
    const statusOption = evaluationPeriodStatusesDb.find(
      (s) => s.id === body.FK_ESTADO
    )

    // El PK lo asigna el backend (identity); el mock lo autoincrementa.
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
      estado: statusOption?.key ?? "NO Calificable",
      estadoId: body.FK_ESTADO,
      estadoName: statusOption?.label,
      academicPeriodId: body.FK_PERIODO ?? 0,
    }
    evaluationPeriodsDb.push(record)

    return HttpResponse.json({
      status: "ok",
      message: "Periodo de evaluación creado.",
    })
  }),

  // Borrado en lote por PK (atómico, una sola request).
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
    const statusOption = evaluationPeriodStatusesDb.find(
      (s) => s.id === body.FK_ESTADO
    )
    evaluationPeriodsDb[index] = {
      ...evaluationPeriodsDb[index],
      codigo: body.CODIGO,
      nombre: body.NOMBRE,
      abreviacion: body.ABREVIACION,
      startDate: body.FECHA_INICIO,
      endDate: body.FECHA_FIN,
      peso: body.PORCENTAJE,
      estado: statusOption?.key ?? evaluationPeriodsDb[index].estado,
      estadoId: body.FK_ESTADO,
      estadoName: statusOption?.label ?? evaluationPeriodsDb[index].estadoName,
    }
    return HttpResponse.json({
      status: "ok",
      message: "Periodo de evaluación actualizado.",
    })
  }),

  // Soft delete expuesto como PUT (no DELETE) — `fn_periodo_eval_soft_delete`.
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
    evaluationPeriodsDb.splice(index, 1)
    return HttpResponse.json({
      status: "ok",
      message: "Periodo de evaluación eliminado.",
    })
  }),
]

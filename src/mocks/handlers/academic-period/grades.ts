import { http, HttpResponse, delay } from "msw"
import { gradesDb, gradeLevelName } from "@/mocks/db/academic-period/grades"

import type {
  CreateGradeRequest,
  ExportFormat,
  ExportResult,
  Grade,
  GradeRecord,
  GradesQueryRequest,
  GradesQueryResponse,
  UpdateGradeRequest,
} from "@/features/establishment/academic-period/api/types/grade"

const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

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

function sortValue(row: Grade, id: string): string | number {
  const value = row[id as keyof Grade]
  if (typeof value === "boolean") return value ? 1 : 0
  return value ?? ""
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
  http.post("/api/grades/query", async ({ request }) => {
    await delay(250)

    const body = (await request.json()) as GradesQueryRequest
    const { filters, sorting, pageIndex, pageSize, academicPeriodId } = body

    const scoped =
      academicPeriodId == null
        ? gradesDb
        : gradesDb.filter((row) => row.academicPeriodId === academicPeriodId)

    const filtered = applySorting(applyFilters(scoped, filters), sorting)

    const totalCount = filtered.length
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = pageIndex * pageSize

    // El backend resuelve el nombre del grado siguiente (TLISTA_VALOR.NOMBRE);
    // el mock lo espeja del valor.
    const rows = filtered
      .slice(start, start + pageSize)
      .map((row) => ({ ...row, gradoSiguienteName: row.gradoSiguiente }))

    return HttpResponse.json<GradesQueryResponse>({
      rows,
      pageCount,
      totalCount,
    })
  }),

  http.post("/api/grades/export", async ({ request }) => {
    await delay(600)
    const { ids, format } = (await request.json()) as {
      ids: number[]
      format: ExportFormat
    }
    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${ids.length} grado(s) exportado(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("/api/grades/export-all", async ({ request }) => {
    await delay(600)
    const { filters, format } = (await request.json()) as {
      filters: GradesQueryRequest["filters"]
      format: ExportFormat
    }
    const count = applyFilters(gradesDb, filters).length
    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${count} grado(s) exportado(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("/api/grades", async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as CreateGradeRequest
    const { academicPeriodId, ...gradeData } = body

    const id = gradesDb.reduce((max, g) => Math.max(max, g.id), 0) + 1
    const newGrade: GradeRecord = {
      id,
      ...gradeData,
      grado: gradeData.grado || gradeData.nombre,
      teachingLevelName: gradeLevelName(gradeData.teachingLevelId),
      academicPeriodId: academicPeriodId ?? 0,
    }
    gradesDb.push(newGrade)

    return HttpResponse.json(newGrade, { status: 201 })
  }),

  // Borrado en lote por ids (atómico, una sola request).
  http.post("/api/grades/bulk-delete", async ({ request }) => {
    await delay(300)
    const { ids } = (await request.json()) as { ids: number[] }
    const set = new Set(ids)
    const before = gradesDb.length
    for (let i = gradesDb.length - 1; i >= 0; i--) {
      if (set.has(gradesDb[i].id)) gradesDb.splice(i, 1)
    }
    return HttpResponse.json({
      status: "ok",
      message: "Grados eliminados.",
      deleted: before - gradesDb.length,
    })
  }),

  http.patch("/api/grades/:id", async ({ params, request }) => {
    await delay(400)
    const index = gradesDb.findIndex((g) => String(g.id) === String(params.id))
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Grado no encontrado." },
        { status: 404 }
      )
    }
    const patch = (await request.json()) as UpdateGradeRequest
    const merged: GradeRecord = { ...gradesDb[index], ...patch }
    if (patch.teachingLevelId != null) {
      merged.teachingLevelName = gradeLevelName(patch.teachingLevelId)
    }
    gradesDb[index] = merged

    return HttpResponse.json({ status: "ok", message: "Grado actualizado." })
  }),

  http.delete("/api/grades/:id", async ({ params }) => {
    await delay(300)
    const index = gradesDb.findIndex((g) => String(g.id) === String(params.id))
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Grado no encontrado." },
        { status: 404 }
      )
    }
    gradesDb.splice(index, 1)
    return HttpResponse.json({ status: "ok", message: "Grado eliminado." })
  }),
]

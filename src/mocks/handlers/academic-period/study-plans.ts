import { http, HttpResponse, delay } from "msw"
import {
  studyPlansDb,
  nextStudyPlanId,
} from "../../db/academic-period/study-plans"
import { areasDb } from "../../db/academic-period/areas"
import { subjectsDb } from "../../db/academic-period/subjects"

import type {
  StudyPlanItem,
  StudyPlanQueryRequest,
  StudyPlanQueryResponse,
  CreateStudyPlanItemRequest,
  UpdateStudyPlanItemRequest,
  AvailableStudyPlanSubject,
} from "@/features/establishment/academic-period/api/types/study-plan"

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
  // Asignaturas del periodo del grado que aún no están en su plan (disponibles).
  http.get(
    "/api/grades/:gradeId/study-plan-available",
    async ({ params, request }) => {
      await delay(200)
      const gradeId = Number(params.gradeId)
      const periodParam = new URL(request.url).searchParams.get(
        "academicPeriodId"
      )
      const periodId = periodParam != null ? Number(periodParam) : undefined

      const scopedAreas =
        periodId == null
          ? areasDb
          : areasDb.filter((a) => a.academicPeriodId === periodId)
      const scopedAreaIds = new Set(scopedAreas.map((a) => a.id))

      // Nombres ya presentes en el plan del grado (para excluirlos).
      const enPlan = new Set(
        studyPlansDb
          .filter((p) => p.gradeId === gradeId)
          .map((p) => p.asignatura)
      )

      const disponibles: AvailableStudyPlanSubject[] = []
      let id = 1
      for (const subject of subjectsDb) {
        if (!scopedAreaIds.has(subject.areaId)) continue
        if (enPlan.has(subject.nombreInterno)) continue
        const area = scopedAreas.find((a) => a.id === subject.areaId)
        disponibles.push({
          id: id++,
          nombre: subject.nombreInterno,
          areaNombre: area?.nombreInterno ?? "",
        })
      }

      return HttpResponse.json<AvailableStudyPlanSubject[]>(disponibles)
    }
  ),

  http.post("/api/study-plans/query", async ({ request }) => {
    await delay(250)

    const body = (await request.json()) as StudyPlanQueryRequest
    const { filters, sorting, pageIndex, pageSize, academicPeriodId, gradeId } =
      body

    const scoped = studyPlansDb.filter((row) => {
      if (gradeId != null) return row.gradeId === gradeId
      if (academicPeriodId != null)
        return row.academicPeriodId === academicPeriodId
      return true
    })

    const filtered = applySorting(applyFilters(scoped, filters), sorting)

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
    // El código lo asigna el backend, no el front.
    const record = {
      ...body,
      codigo: nextStudyPlanId(),
      academicPeriodId: body.academicPeriodId ?? 0,
      gradeId: body.gradeId ?? 0,
    }
    studyPlansDb.push(record)
    return HttpResponse.json(record, { status: 201 })
  }),

  http.patch("/api/study-plans/:codigo", async ({ request, params }) => {
    await delay(400)
    const body = (await request.json()) as UpdateStudyPlanItemRequest
    const index = studyPlansDb.findIndex(
      (row) => String(row.codigo) === String(params.codigo)
    )
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Asignatura no encontrada." },
        { status: 404 }
      )
    }
    studyPlansDb[index] = { ...studyPlansDb[index], ...body }
    return HttpResponse.json({
      status: "ok",
      message: "Asignatura del plan de estudio actualizada.",
    })
  }),

  http.delete("/api/study-plans/:codigo", async ({ params }) => {
    await delay(300)
    const index = studyPlansDb.findIndex(
      (row) => String(row.codigo) === String(params.codigo)
    )
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Asignatura no encontrada." },
        { status: 404 }
      )
    }
    studyPlansDb.splice(index, 1)
    return HttpResponse.json({
      status: "ok",
      message: "Asignatura eliminada del plan de estudio.",
    })
  }),
]

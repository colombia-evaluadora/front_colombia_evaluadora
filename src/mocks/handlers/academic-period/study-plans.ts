import { http, HttpResponse, delay } from "msw"
import {
  studyPlansDb,
  nextStudyPlanId,
} from "../../db/academic-period/study-plans"
import { areasDb } from "../../db/academic-period/areas"
import { subjectsDb } from "../../db/academic-period/subjects"

import type { StudyPlanRecord } from "@/features/establishment/academic-period/api/types/study-plan"

interface StudyPlanWriteBody {
  FK_ASIGNATURA: number | null
  NUMERO_HORA: number
  INFLUENCIA_AREA: number
  NUMERO_CREDITO: number
  INFLUYE_DESEMPENO: boolean
  MATRICULA_OBLIGATORIA: boolean
  APROBACION_OBLIGATORIA: boolean
  FK_FORMATO_CALIF: number | null
  FK_CRITERIO_NOTA: number | null
}

function toRawRow(row: StudyPlanRecord, totalCount?: number) {
  return {
    codigo: row.codigo,
    asignatura: row.asignatura,
    intensidad_horaria: row.intensidadHoraria,
    influencia_area: row.influenciaArea,
    numero_creditos: row.numeroCreditos,
    influye_desempeno: row.influyeDesempeno,
    matricula_obligatoria: row.matriculaObligatoria ?? false,
    aprobacion_obligatoria: row.aprobacionObligatoria ?? false,
    formato_calificacion: row.formatoCalificacion ? Number(row.formatoCalificacion) : 0,
    criterio_nota: row.criterioNota ? Number(row.criterioNota) : 0,
    personalizado: row.personalizado ?? false,
    ...(totalCount != null ? { total_count: totalCount } : {}),
  }
}

function applyFilters(rows: StudyPlanRecord[], filtro: string | null) {
  if (!filtro) return rows
  const needle = filtro.toLowerCase()
  return rows.filter((row) => row.asignatura.toLowerCase().includes(needle))
}

function subjectName(id: number | null): string {
  if (id == null) return ""
  return subjectsDb.find((s) => s.id === id)?.nombreInterno ?? ""
}

export const studyPlansHandlers = [
  // Asignaturas del periodo del grado que aún no están en su plan
  // (`fn_plan_asignaturas_disponibles_listar`, id_query 78) — path real (ver
  // `use-available-study-plan-subjects-query.ts`), no el
  // `/api/grades/:gradeId/study-plan-available` viejo.
  http.get("/api/eval-col/grados/:gradeId/plan-disponibles", async ({ params }) => {
    await delay(200)
    const gradeId = Number(params.gradeId)

    const enPlan = new Set(
      studyPlansDb.filter((p) => p.gradeId === gradeId).map((p) => p.asignatura)
    )

    const disponibles: { id: number; nombre: string; area_id: number; area_nombre: string }[] = []
    for (const subject of subjectsDb) {
      if (enPlan.has(subject.nombreInterno)) continue
      const area = areasDb.find((a) => a.id === subject.areaId)
      disponibles.push({
        id: subject.id,
        nombre: subject.nombreInterno,
        area_id: subject.areaId,
        area_nombre: area?.nombreInterno ?? "",
      })
    }

    return HttpResponse.json({ rows: disponibles })
  }),

  // `fn_plan_listar` (id_query 76) — path/params reales (ver
  // `use-study-plans.ts`), no el `/api/study-plans/query` viejo. Mismo bug
  // que Criterio de promoción sin esto.
  http.get("/api/eval-col/grados/:gradeId/plan-asignaturas", async ({ params, request }) => {
    await delay(250)
    const gradeId = Number(params.gradeId)
    const url = new URL(request.url)
    const filtro = url.searchParams.get("filtro")
    const pageIndex = Number(url.searchParams.get("pageIndex") ?? 0)
    const pageSize = Number(url.searchParams.get("pageSize") ?? 10)

    const scoped = studyPlansDb.filter((row) => row.gradeId === gradeId)
    const filtered = applyFilters(scoped, filtro)
    const totalCount = filtered.length
    const start = pageIndex * pageSize
    const rows = filtered.slice(start, start + pageSize).map((row) => toRawRow(row, totalCount))
    return HttpResponse.json({ rows })
  }),

  http.post("/api/eval-col/grados/:gradeId/plan-asignaturas", async ({ params, request }) => {
    await delay(400)
    const gradeId = Number(params.gradeId)
    const body = (await request.json()) as StudyPlanWriteBody
    const codigo = nextStudyPlanId()
    const record: StudyPlanRecord = {
      codigo,
      asignatura: subjectName(body.FK_ASIGNATURA),
      intensidadHoraria: body.NUMERO_HORA,
      influenciaArea: body.INFLUENCIA_AREA,
      numeroCreditos: body.NUMERO_CREDITO,
      influyeDesempeno: body.INFLUYE_DESEMPENO,
      matriculaObligatoria: body.MATRICULA_OBLIGATORIA,
      aprobacionObligatoria: body.APROBACION_OBLIGATORIA,
      formatoCalificacion: body.FK_FORMATO_CALIF != null ? String(body.FK_FORMATO_CALIF) : undefined,
      criterioNota: body.FK_CRITERIO_NOTA != null ? String(body.FK_CRITERIO_NOTA) : undefined,
      personalizado: body.FK_FORMATO_CALIF != null || body.FK_CRITERIO_NOTA != null,
      academicPeriodId: 0,
      gradeId,
    }
    studyPlansDb.push(record)
    return HttpResponse.json({ rows: [{ fn_plan_agregar: codigo }] })
  }),

  http.put("/api/eval-col/plan-asignaturas/:codigo", async ({ request, params }) => {
    await delay(400)
    const body = (await request.json()) as StudyPlanWriteBody
    const index = studyPlansDb.findIndex(
      (row) => String(row.codigo) === String(params.codigo)
    )
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Asignatura no encontrada." },
        { status: 404 }
      )
    }
    studyPlansDb[index] = {
      ...studyPlansDb[index],
      asignatura: body.FK_ASIGNATURA != null ? subjectName(body.FK_ASIGNATURA) : studyPlansDb[index].asignatura,
      intensidadHoraria: body.NUMERO_HORA,
      influenciaArea: body.INFLUENCIA_AREA,
      numeroCreditos: body.NUMERO_CREDITO,
      influyeDesempeno: body.INFLUYE_DESEMPENO,
      matriculaObligatoria: body.MATRICULA_OBLIGATORIA,
      aprobacionObligatoria: body.APROBACION_OBLIGATORIA,
      formatoCalificacion: body.FK_FORMATO_CALIF != null ? String(body.FK_FORMATO_CALIF) : undefined,
      criterioNota: body.FK_CRITERIO_NOTA != null ? String(body.FK_CRITERIO_NOTA) : undefined,
      personalizado: body.FK_FORMATO_CALIF != null || body.FK_CRITERIO_NOTA != null,
    }
    return HttpResponse.json({
      status: "ok",
      message: "Asignatura del plan de estudio actualizada.",
    })
  }),

  http.put("/api/eval-col/plan-asignaturas/:codigo/eliminar", async ({ params }) => {
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

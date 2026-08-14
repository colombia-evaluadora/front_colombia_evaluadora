import { http, HttpResponse, delay } from "msw"

import { gradesDb } from "@/mocks/db/academic-period/grades"
import { gradeGroupsDb } from "@/mocks/db/academic-period/grade-groups"
import { studyPlansDb } from "@/mocks/db/academic-period/study-plans"
import { teacherAssignmentsDb } from "@/mocks/db/academic-period/teacher-assignments"

function jornadaAbbrev(jornada: string): string {
  return jornada.trim().charAt(0).toUpperCase() || "—"
}

// `fn_asignacion_pool`/`fn_asignacion_docente`/`fn_asignacion_guardar`
// (ids_query 83/84/82) — paths reales (ver `use-assignment-subjects.ts`/
// `use-teacher-assignments.ts`/`save-teacher-assignments.ts`), no los
// `/api/academic-periods/:id/assignment-subjects` y
// `/api/academic-periods/:id/teachers/:funcionarioId/assignments` viejos.
// Sin esto, la pestaña de Asignación docente caía al mismo bug de logout
// que Criterio de promoción — ninguna de las tres requests matcheaba.
export const academicAssignmentsHandlers = [
  http.get("/api/eval-col/asignaciones/pool", async ({ request }) => {
    await delay(250)
    const academicPeriodId = Number(new URL(request.url).searchParams.get("academicPeriodId"))

    const grades = gradesDb.filter((grade) => grade.academicPeriodId === academicPeriodId)
    const rows: { id: string; nombre: string; grado_grupo: string; jornada: string; jornada_name: string }[] = []
    for (const grade of grades) {
      const groups = gradeGroupsDb.filter((group) => group.gradeId === grade.id)
      const plan = studyPlansDb.filter((item) => item.gradeId === grade.id)
      for (const group of groups) {
        for (const item of plan) {
          rows.push({
            // El backend usa el par "grupoId:asignaturaId" (PK_TGRUPO:PK_TASIGNATURA).
            // En el mock no hay id de asignatura suelto, así que usamos el código
            // del renglón de plan como segundo componente.
            id: `${group.id}:${item.codigo}`,
            nombre: item.asignatura,
            grado_grupo: group.codigo,
            jornada: jornadaAbbrev(group.jornada),
            jornada_name: group.jornada,
          })
        }
      }
    }
    return HttpResponse.json({ rows })
  }),

  http.get("/api/eval-col/asignaciones/docente/:funcionarioId", async ({ params, request }) => {
    await delay(200)
    const periodId = Number(new URL(request.url).searchParams.get("academicPeriodId"))
    const funcionarioId = String(params.funcionarioId)
    const ids = teacherAssignmentsDb[periodId]?.[funcionarioId] ?? []
    return HttpResponse.json({ rows: ids.map((assignment_id) => ({ assignment_id })) })
  }),

  http.post("/api/eval-col/asignaciones", async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as {
      ACADEMIC_PERIOD_ID: number
      FK_FUNCIONARIO: string
      SUBJECT_IDS: string[]
    }
    const byTeacher = teacherAssignmentsDb[body.ACADEMIC_PERIOD_ID] ?? {}
    byTeacher[body.FK_FUNCIONARIO] = body.SUBJECT_IDS
    teacherAssignmentsDb[body.ACADEMIC_PERIOD_ID] = byTeacher
    return HttpResponse.json({ status: "ok", message: "Asignaturas del docente guardadas." })
  }),
]

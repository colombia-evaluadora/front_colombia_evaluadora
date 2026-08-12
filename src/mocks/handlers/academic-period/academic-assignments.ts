import { http, HttpResponse, delay } from "msw"

import { gradesDb } from "../../db/academic-period/grades"
import { gradeGroupsDb } from "../../db/academic-period/grade-groups"
import { studyPlansDb } from "../../db/academic-period/study-plans"
import { teacherAssignmentsDb } from "../../db/academic-period/teacher-assignments"
import type {
  AssignmentSubject,
  MutationResult,
} from "@/features/establishment/academic-period/api/types/academic-assignment"

function jornadaAbbrev(jornada: string): string {
  return jornada.trim().charAt(0).toUpperCase() || "—"
}

export const academicAssignmentsHandlers = [
  http.get(
    "/api/academic-periods/:academicPeriodId/assignment-subjects",
    async ({ params }) => {
      await delay(250)
      const academicPeriodId = Number(params.academicPeriodId)

      const grades = gradesDb.filter(
        (grade) => grade.academicPeriodId === academicPeriodId
      )

      const subjects: AssignmentSubject[] = []
      for (const grade of grades) {
        const groups = gradeGroupsDb.filter(
          (group) => group.gradeId === grade.id
        )
        const plan = studyPlansDb.filter((item) => item.gradeId === grade.id)

        for (const group of groups) {
          for (const item of plan) {
            subjects.push({
              // El backend usa el par "grupoId:asignaturaId" (PK_TGRUPO:PK_TASIGNATURA).
              // En el mock no hay id de asignatura suelto, así que usamos el código
              // del renglón de plan como segundo componente; lo importante es que
              // sea "número:número" y haga round-trip con el guardado.
              id: `${group.id}:${item.codigo}`,
              nombre: item.asignatura,
              gradoGrupo: group.codigo,
              jornada: jornadaAbbrev(group.jornada),
              // El backend manda el nombre completo (TLISTA_VALOR.NOMBRE);
              // `jornada` es solo la inicial para la ficha.
              jornadaName: group.jornada,
            })
          }
        }
      }

      return HttpResponse.json<AssignmentSubject[]>(subjects)
    }
  ),

  http.get(
    "/api/academic-periods/:academicPeriodId/teachers/:funcionarioId/assignments",
    async ({ params }) => {
      await delay(200)
      const periodId = Number(params.academicPeriodId)
      const funcionarioId = String(params.funcionarioId)
      const ids = teacherAssignmentsDb[periodId]?.[funcionarioId] ?? []
      return HttpResponse.json<string[]>(ids)
    }
  ),

  http.put(
    "/api/academic-periods/:academicPeriodId/teachers/:funcionarioId/assignments",
    async ({ params, request }) => {
      await delay(400)
      const periodId = Number(params.academicPeriodId)
      const funcionarioId = String(params.funcionarioId)
      const { subjectIds } = (await request.json()) as {
        subjectIds: string[]
      }

      const byTeacher = teacherAssignmentsDb[periodId] ?? {}
      byTeacher[funcionarioId] = subjectIds
      teacherAssignmentsDb[periodId] = byTeacher

      return HttpResponse.json<MutationResult>({
        status: "ok",
        message: "Asignaturas del docente guardadas.",
      })
    }
  ),
]

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
              id: `${grade.id}-${group.codigo}-${item.codigo}`,
              nombre: item.asignatura,
              gradoGrupo: group.codigo,
              jornada: jornadaAbbrev(group.jornada),
            })
          }
        }
      }

      return HttpResponse.json<AssignmentSubject[]>(subjects)
    }
  ),

  http.get(
    "/api/academic-periods/:academicPeriodId/teachers/:documento/assignments",
    async ({ params }) => {
      await delay(200)
      const periodId = Number(params.academicPeriodId)
      const documento = String(params.documento)
      const ids = teacherAssignmentsDb[periodId]?.[documento] ?? []
      return HttpResponse.json<string[]>(ids)
    }
  ),

  http.put(
    "/api/academic-periods/:academicPeriodId/teachers/:documento/assignments",
    async ({ params, request }) => {
      await delay(400)
      const periodId = Number(params.academicPeriodId)
      const documento = String(params.documento)
      const { subjectIds } = (await request.json()) as {
        subjectIds: string[]
      }

      const byTeacher = teacherAssignmentsDb[periodId] ?? {}
      byTeacher[documento] = subjectIds
      teacherAssignmentsDb[periodId] = byTeacher

      return HttpResponse.json<MutationResult>({
        status: "ok",
        message: "Asignaturas del docente guardadas.",
      })
    }
  ),
]

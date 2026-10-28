import { http, HttpResponse, delay } from "msw"

import { gradesDb } from "@/mocks/db/academic-period/grades"
import { gradeGroupsDb } from "@/mocks/db/academic-period/grade-groups"
import { studyPlansDb } from "@/mocks/db/academic-period/study-plans"
import { academicPeriodsDb } from "@/mocks/db/academic-period/academic-periods"
import { funcionariosDb } from "@/mocks/db/academic-period/funcionarios"
import {
  academicAssignmentsDb,
  seededPeriods,
} from "@/mocks/db/academic-period/academic-assignments"
import { employeesDb, employeesRowsDb } from "@/mocks/db/employees"
import { nextId } from "@/mocks/db/next-id"
import type { AcademicAssignmentRow } from "@/features/establishment/academic-period/api/query/use-academic-assignments"

// Asignaciones académicas: una fila por Docente + Grupo + [Área] (Sección 5.4).

interface AssignmentWriteBody {
  ACADEMIC_PERIOD_ID?: number
  FK_FUNCIONARIO: string
  FK_GRUPOS?: number[]
  FK_GRUPO?: number
  FK_ASIGNATURA: number
}

const assignmentError = (message: string, status = 409) =>
  HttpResponse.json({ status: "error", message }, { status })

// Docentes con rol activo en la sede del período (Regla 68); mismo filtro
// que `/asignaciones/docentes/:academicPeriodId`.
function periodTeachers(periodId: number) {
  const period = academicPeriodsDb.find((p) => p.id === periodId)
  const sedeId = period?.sedeId != null ? Number(period.sedeId) : null
  return employeesRowsDb.filter((row) => {
    const employee = employeesDb.find((item) => item.id === row.id)
    return (
      row.roles.some((role) => role.code === "TEACHER") &&
      sedeId != null &&
      Boolean(employee?.permissions.some((p) => p.campus.id === sedeId))
    )
  })
}

function periodGroups(periodId: number) {
  const gradeIds = new Set(gradesDb.filter((g) => g.academicPeriodId === periodId).map((g) => g.id))
  return gradeGroupsDb.filter((g) => gradeIds.has(g.gradeId))
}

function seedPeriod(periodId: number) {
  if (seededPeriods.has(periodId)) return
  seededPeriods.add(periodId)
  const teachers = periodTeachers(periodId)
  if (teachers.length === 0) return
  let id = nextId(
    academicAssignmentsDb.map((a) => a.id),
    1,
  )
  periodGroups(periodId).forEach((group, gi) => {
    studyPlansDb
      .filter((item) => item.gradeId === group.gradeId)
      .slice(0, 3)
      .forEach((item, si) => {
        academicAssignmentsDb.push({
          id: id++,
          periodId,
          funcionarioId: String(teachers[(gi + si) % teachers.length].id),
          groupId: group.id,
          subjectId: item.asignaturaId,
          // Una inactiva para ver el badge.
          status: gi === 0 && si === 1 ? "I" : "A",
        })
      })
  })
}

function teacherName(funcionarioId: string) {
  return (
    employeesRowsDb.find((row) => String(row.id) === funcionarioId)?.name ??
    funcionariosDb.find((f) => String(f.id) === funcionarioId)?.nombre ??
    ""
  )
}

function assignmentRows(periodId: number): AcademicAssignmentRow[] {
  seedPeriod(periodId)
  const groups = periodGroups(periodId)
  const groupById = new Map(groups.map((g) => [g.id, g]))
  const subjectName = (gradeId: number, subjectId: number) =>
    studyPlansDb.find((p) => p.gradeId === gradeId && p.asignaturaId === subjectId)?.asignatura ??
    ""
  const gradeName = (gradeId: number) => gradesDb.find((g) => g.id === gradeId)?.nombre ?? ""

  const manual: AcademicAssignmentRow[] = academicAssignmentsDb
    .filter((a) => a.periodId === periodId && groupById.has(a.groupId))
    // Con la casilla de la Regla 108 el grupo solo tiene las automáticas.
    .filter((a) => !groupById.get(a.groupId)?.dictaTodas)
    .map((a) => {
      const group = groupById.get(a.groupId)!
      return {
        id: a.id,
        funcionario_id: a.funcionarioId,
        docente: teacherName(a.funcionarioId),
        grado_id: group.gradeId,
        grado: gradeName(group.gradeId),
        grupo_id: group.id,
        grupo: group.codigo,
        asignatura_id: a.subjectId,
        asignatura: subjectName(group.gradeId, a.subjectId),
        estado: a.status,
        automatica: false,
      }
    })
  // Regla 108: el Responsable de grupo dicta todo el plan de su grupo.
  const automatic: AcademicAssignmentRow[] = groups
    .filter((g) => g.dictaTodas && g.directorId != null)
    .flatMap((group) =>
      studyPlansDb
        .filter((item) => item.gradeId === group.gradeId)
        .map((item) => ({
          id: -(group.id * 1000 + item.codigo),
          funcionario_id: String(group.directorId),
          docente: teacherName(String(group.directorId)),
          grado_id: group.gradeId,
          grado: gradeName(group.gradeId),
          grupo_id: group.id,
          grupo: group.codigo,
          asignatura_id: item.asignaturaId,
          asignatura: item.asignatura,
          estado: "A" as const,
          automatica: true,
        })),
    )
  return [...manual, ...automatic].sort(
    (a, b) =>
      a.docente.localeCompare(b.docente) ||
      a.grupo.localeCompare(b.grupo) ||
      a.asignatura.localeCompare(b.asignatura),
  )
}

// Rol activo (Regla 68) y asignación única por Grupo y [Área] (Regla 69),
// con los mensajes del md.
function validateAssignment(
  periodId: number,
  body: AssignmentWriteBody,
  groupIds: number[],
  exceptId?: number,
): string | null {
  const groups = periodGroups(periodId)
  if (!periodTeachers(periodId).some((t) => String(t.id) === String(body.FK_FUNCIONARIO))) {
    return "El docente no tiene el rol Docente activo en la Sede y Jornada del período."
  }
  for (const groupId of groupIds) {
    const group = groups.find((g) => g.id === groupId)
    if (!group) return "El grupo no pertenece al período."
    if (
      !studyPlansDb.some(
        (p) => p.gradeId === group.gradeId && p.asignaturaId === body.FK_ASIGNATURA,
      )
    ) {
      return "La asignatura no está en el plan de estudio del grado."
    }
    if (group.dictaTodas && group.directorId != null) {
      return `El grupo ${group.codigo} tiene a ${teacherName(String(group.directorId))} como Responsable de todas las asignaturas del plan. Para asignar a otro Responsable de enseñanza, desmarque la casilla del grupo.`
    }
  }
  const taken = assignmentRows(periodId).filter(
    (r) =>
      r.id !== exceptId && groupIds.includes(r.grupo_id) && r.asignatura_id === body.FK_ASIGNATURA,
  )
  if (taken.length === 1) {
    const t = taken[0]
    return `${t.asignatura} en ${t.grupo} ya está asignada a ${t.docente}. Elimine esa asignación para asignarla a otro.`
  }
  if (taken.length > 1) {
    const list = taken.map((t) => `${t.grupo} (${t.docente})`).join(", ")
    return `${taken[0].asignatura} ya está asignada en ${list}. Elimine esas asignaciones para asignarlas a otro.`
  }
  return null
}

export const academicAssignmentListHandlers = [
  http.get("/api/eval-col/asignaciones/listar/:academicPeriodId", async ({ params }) => {
    await delay(250)
    return HttpResponse.json({ rows: assignmentRows(Number(params.academicPeriodId)) })
  }),

  http.post("/api/eval-col/asignaciones/crear", async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as AssignmentWriteBody
    const periodId = Number(body.ACADEMIC_PERIOD_ID)
    const groupIds = body.FK_GRUPOS ?? []
    if (groupIds.length === 0) return assignmentError("Seleccione al menos un grupo.", 400)
    const error = validateAssignment(periodId, body, groupIds)
    if (error) return assignmentError(error)
    let id = nextId(
      academicAssignmentsDb.map((a) => a.id),
      1,
    )
    const rows = groupIds.map((groupId) => {
      academicAssignmentsDb.push({
        id,
        periodId,
        funcionarioId: String(body.FK_FUNCIONARIO),
        groupId,
        subjectId: body.FK_ASIGNATURA,
        status: "A",
      })
      return { fn_asignacion_crear: id++ }
    })
    return HttpResponse.json({ rows })
  }),

  http.patch("/api/eval-col/asignaciones/:id/estado", async ({ params, request }) => {
    await delay(200)
    const record = academicAssignmentsDb.find((a) => a.id === Number(params.id))
    if (!record) return assignmentError("Asignación académica no encontrada.", 404)
    const body = (await request.json()) as { ESTADO: "A" | "I" }
    record.status = body.ESTADO
    return HttpResponse.json({ rows: [] })
  }),

  http.patch("/api/eval-col/asignaciones/:id/eliminar", async ({ params }) => {
    await delay(200)
    const index = academicAssignmentsDb.findIndex((a) => a.id === Number(params.id))
    if (index < 0) return assignmentError("Asignación académica no encontrada.", 404)
    academicAssignmentsDb.splice(index, 1)
    return HttpResponse.json({ rows: [] })
  }),

  http.put("/api/eval-col/asignaciones/:id", async ({ params, request }) => {
    await delay(300)
    const record = academicAssignmentsDb.find((a) => a.id === Number(params.id))
    if (!record) return assignmentError("Asignación académica no encontrada.", 404)
    const body = (await request.json()) as AssignmentWriteBody
    const groupId = Number(body.FK_GRUPO)
    const error = validateAssignment(record.periodId, body, [groupId], record.id)
    if (error) return assignmentError(error)
    Object.assign(record, {
      funcionarioId: String(body.FK_FUNCIONARIO),
      groupId,
      subjectId: body.FK_ASIGNATURA,
    })
    return HttpResponse.json({ rows: [{ fn_asignacion_actualizar: record.id }] })
  }),
]

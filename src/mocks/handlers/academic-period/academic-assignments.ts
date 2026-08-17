import { http, HttpResponse, delay } from "msw"

import { gradesDb } from "@/mocks/db/academic-period/grades"
import { gradeGroupsDb } from "@/mocks/db/academic-period/grade-groups"
import { studyPlansDb } from "@/mocks/db/academic-period/study-plans"
import { teacherAssignmentsDb } from "@/mocks/db/academic-period/teacher-assignments"
import { academicPeriodsDb } from "@/mocks/db/academic-period/academic-periods"
import { employeesDb, employeesRowsDb } from "@/mocks/db/employees"
import type { EmployeeStatus } from "@/features/establishment/employees/api/types/employee"

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
  http.get("/api/eval-col/asignaciones/pool/:academicPeriodId", async ({ params, request }) => {
    await delay(250)
    const academicPeriodId = Number(params.academicPeriodId)
    const soloSinDocente = new URL(request.url).searchParams.get("soloSinDocente") === "true"

    // Id "grupoId:asignaturaId" -> funcionarioId que ya lo tiene asignado en
    // el periodo (V89) — el front usa esto para no mostrar como "disponible"
    // una materia que ya tiene OTRO docente, sin ocultarla del pool entero
    // (así el docente que sí la tiene la sigue viendo en "actuales").
    const funcionarioByAssignmentId = new Map<string, string>()
    for (const [funcionarioId, ids] of Object.entries(teacherAssignmentsDb[academicPeriodId] ?? {})) {
      for (const id of ids) funcionarioByAssignmentId.set(id, funcionarioId)
    }

    const grades = gradesDb.filter((grade) => grade.academicPeriodId === academicPeriodId)
    const rows: {
      id: string
      nombre: string
      grado_grupo: string
      jornada: string
      jornada_name: string
      funcionario_id: string | null
    }[] = []
    for (const grade of grades) {
      const groups = gradeGroupsDb.filter((group) => group.gradeId === grade.id)
      const plan = studyPlansDb.filter((item) => item.gradeId === grade.id)
      for (const group of groups) {
        for (const item of plan) {
          // El backend usa el par "grupoId:asignaturaId" (PK_TGRUPO:PK_TASIGNATURA).
          // En el mock no hay id de asignatura suelto, así que usamos el código
          // del renglón de plan como segundo componente.
          const id = `${group.id}:${item.codigo}`
          const funcionarioId = funcionarioByAssignmentId.get(id) ?? null
          if (soloSinDocente && funcionarioId != null) continue
          rows.push({
            id,
            nombre: item.asignatura,
            grado_grupo: group.codigo,
            jornada: jornadaAbbrev(group.jornada),
            jornada_name: group.jornada,
            funcionario_id: funcionarioId,
          })
        }
      }
    }
    return HttpResponse.json({ rows })
  }),

  http.get("/api/eval-col/asignaciones/:academicPeriodId/docente/:funcionarioId", async ({ params }) => {
    await delay(200)
    const periodId = Number(params.academicPeriodId)
    const funcionarioId = String(params.funcionarioId)
    const ids = teacherAssignmentsDb[periodId]?.[funcionarioId] ?? []
    return HttpResponse.json({ rows: ids.map((assignment_id) => ({ assignment_id })) })
  }),

  // `fn_asignacion_docente_listar` (id_query nuevo — V83/V84/V85) — docentes
  // de la sede del periodo (rol TEACHER con permiso en esa sede), no
  // cualquier funcionario como devolvía `/api/establishments/employees/query`.
  // `PERIODO_ACADEMICO_ID` va por path param desde V85.
  http.get("/api/eval-col/asignaciones/docentes/:academicPeriodId", async ({ params, request }) => {
    await delay(250)
    const url = new URL(request.url)
    const academicPeriodId = Number(params.academicPeriodId)
    const filtro = url.searchParams.get("filtro")?.toLowerCase()
    const estado = url.searchParams.get("estado") as EmployeeStatus | null
    const pageIndex = Number(url.searchParams.get("pageIndex") ?? 0)
    const pageSize = Number(url.searchParams.get("pageSize") ?? 10)
    const sortBy = url.searchParams.get("sortBy")
    const sortDir = url.searchParams.get("sortDir")

    const period = academicPeriodsDb.find((p) => p.id === academicPeriodId)
    const sedeId = period?.sedeId != null ? String(period.sedeId) : null

    let rows = employeesRowsDb.filter((row) => {
      const employee = employeesDb.find((item) => item.id === row.id)
      const isTeacher = row.roles.some((role) => role.code === "TEACHER")
      const inSede = sedeId != null && employee?.permissions.some((p) => p.campus.id === sedeId)
      return isTeacher && inSede
    })

    if (estado) {
      rows = rows.filter((row) => row.statuses.includes(estado))
    }
    if (filtro) {
      rows = rows.filter(
        (row) =>
          row.documentNumber.toLowerCase().includes(filtro) ||
          row.name.toLowerCase().includes(filtro),
      )
    }
    if (sortBy) {
      const key = sortBy === "documentNumber" ? "documentNumber" : sortBy === "status" ? null : "name"
      rows = [...rows].sort((a, b) => {
        const av = key === "documentNumber" ? a.documentNumber : key === "name" ? a.name : (a.statuses[0] ?? "")
        const bv = key === "documentNumber" ? b.documentNumber : key === "name" ? b.name : (b.statuses[0] ?? "")
        return av > bv ? 1 : av < bv ? -1 : 0
      })
      if (sortDir === "desc") rows.reverse()
    }

    const totalCount = rows.length
    const start = pageIndex * pageSize
    const page = rows.slice(start, start + pageSize)

    return HttpResponse.json({
      rows: page.map((row) => ({
        // El backend real usa PK_TFUNCIONARIO (BIGINT); el mock reusa el id
        // (uuid) de `employeesDb` tal cual — el front solo lo trata como
        // string opaco (`String(funcionario_id)`), así que no hace falta
        // simular un id numérico.
        funcionario_id: row.id,
        document_number: row.documentNumber,
        nombre_completo: row.name,
        estado: row.statuses[0] === "SUSPENDED" ? "I" : "A",
        total_count: totalCount,
      })),
    })
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

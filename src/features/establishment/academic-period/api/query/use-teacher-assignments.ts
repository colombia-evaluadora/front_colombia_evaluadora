import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

interface AssignmentIdRow {
  assignment_id: string
}
interface TeacherAssignmentsResponse {
  rows: AssignmentIdRow[]
}

// Ids de asignaturas ya asignadas a un docente en el periodo ("grupoId:asignaturaId").
// `GET /eval-col/asignaciones/:ACADEMIC_PERIOD_ID/docente/:ID` (`fn_asignacion_docente`,
// id_query 84 — corregido en V69 (academic_period_id/fk_funcionario invertidos)
// y de nuevo ahora: ambos periodo y funcionario van por path param, no uno de
// los dos por query string.
async function fetchTeacherAssignments(
  academicPeriodId: number,
  funcionarioId: string
): Promise<string[]> {
  const raw: TeacherAssignmentsResponse = await api.get(
    `/eval-col/asignaciones/${academicPeriodId}/docente/${funcionarioId}`
  )
  return (raw.rows ?? []).map((row) => row.assignment_id)
}

export const teacherAssignmentsQueryKey = (
  academicPeriodId: number,
  funcionarioId: string
) => ["teacher-assignments", academicPeriodId, funcionarioId]

export function useTeacherAssignmentsQuery(
  academicPeriodId: number | undefined,
  funcionarioId: string | undefined
) {
  return useQuery({
    queryKey: teacherAssignmentsQueryKey(
      academicPeriodId ?? 0,
      funcionarioId ?? ""
    ),
    queryFn: () =>
      fetchTeacherAssignments(
        academicPeriodId as number,
        funcionarioId as string
      ),
    enabled: academicPeriodId != null && funcionarioId != null,
  })
}

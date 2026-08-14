import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

// Ids de asignaturas ya asignadas a un docente en el periodo.
// Identifica al docente por `documentNumber` (viene del listado de
// funcionarios del módulo de establecimientos).
function fetchTeacherAssignments(
  academicPeriodId: number,
  documentNumber: string,
): Promise<string[]> {
  return api.get(`/academic-periods/${academicPeriodId}/teachers/${documentNumber}/assignments`)
}

export const teacherAssignmentsQueryKey = (academicPeriodId: number, documentNumber: string) => [
  "teacher-assignments",
  academicPeriodId,
  documentNumber,
]

export function useTeacherAssignmentsQuery(
  academicPeriodId: number | undefined,
  documentNumber: string | undefined,
) {
  return useQuery({
    queryKey: teacherAssignmentsQueryKey(academicPeriodId ?? 0, documentNumber ?? ""),
    queryFn: () => fetchTeacherAssignments(academicPeriodId as number, documentNumber as string),
    enabled: academicPeriodId != null && documentNumber != null,
  })
}

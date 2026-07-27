import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

// Ids de asignaturas ya asignadas a un docente en el periodo.
function fetchTeacherAssignments(
  academicPeriodId: number,
  documento: string
): Promise<string[]> {
  return api.get(
    `/academic-periods/${academicPeriodId}/teachers/${documento}/assignments`
  )
}

export const teacherAssignmentsQueryKey = (
  academicPeriodId: number,
  documento: string
) => ["teacher-assignments", academicPeriodId, documento]

export function useTeacherAssignmentsQuery(
  academicPeriodId: number | undefined,
  documento: string | undefined
) {
  return useQuery({
    queryKey: teacherAssignmentsQueryKey(academicPeriodId ?? 0, documento ?? ""),
    queryFn: () =>
      fetchTeacherAssignments(academicPeriodId as number, documento as string),
    enabled: academicPeriodId != null && documento != null,
  })
}

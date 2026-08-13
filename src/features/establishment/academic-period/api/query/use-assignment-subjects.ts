import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { AssignmentSubject } from "@/features/establishment/academic-period/types/academic-assignment"

// Pool de asignaturas asignables del periodo: grado × grupo × plan de estudio.
function fetchAssignmentSubjects(
  academicPeriodId: number
): Promise<AssignmentSubject[]> {
  return api.get(`/academic-periods/${academicPeriodId}/assignment-subjects`)
}

export const assignmentSubjectsQueryKey = (academicPeriodId: number) => [
  "assignment-subjects",
  academicPeriodId,
]

export function useAssignmentSubjectsQuery(academicPeriodId: number | undefined) {
  return useQuery({
    queryKey: assignmentSubjectsQueryKey(academicPeriodId ?? 0),
    queryFn: () => fetchAssignmentSubjects(academicPeriodId as number),
    enabled: academicPeriodId != null,
  })
}

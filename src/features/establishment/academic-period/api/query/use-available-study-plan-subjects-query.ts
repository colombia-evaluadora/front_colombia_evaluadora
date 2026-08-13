import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { AvailableStudyPlanSubject } from "../types/study-plan"

// Asignaturas del periodo del grado que aún no están en su plan de estudio.
// Backend: `GET /grades/:gradeId/study-plan-available` → `fn_plan_asignaturas_disponibles_listar`.
function fetchAvailableStudyPlanSubjects(
  gradeId: number,
  academicPeriodId?: number
): Promise<AvailableStudyPlanSubject[]> {
  const qs = academicPeriodId != null ? `?academicPeriodId=${academicPeriodId}` : ""
  return api.get(`/grades/${gradeId}/study-plan-available${qs}`)
}

export const availableStudyPlanSubjectsQueryKey = (
  gradeId?: number,
  academicPeriodId?: number
) => ["study-plan-available", gradeId, academicPeriodId]

export function useAvailableStudyPlanSubjectsQuery(
  gradeId?: number,
  academicPeriodId?: number
) {
  return useQuery({
    queryKey: availableStudyPlanSubjectsQueryKey(gradeId, academicPeriodId),
    queryFn: () =>
      fetchAvailableStudyPlanSubjects(gradeId as number, academicPeriodId),
    enabled: gradeId != null,
  })
}

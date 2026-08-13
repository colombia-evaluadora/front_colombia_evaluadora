import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { EvaluationCriteria } from "@/features/establishment/academic-period/api/types/evaluation-criteria"

function fetchEvaluationCriteria(
  academicPeriodId: number
): Promise<EvaluationCriteria> {
  return api.get(`/evaluation-criteria/${academicPeriodId}`)
}

export const evaluationCriteriaQueryKey = (academicPeriodId: number) => [
  "evaluation-criteria",
  academicPeriodId,
]

export function useEvaluationCriteriaQuery(
  academicPeriodId: number | undefined
) {
  return useQuery({
    queryKey: evaluationCriteriaQueryKey(academicPeriodId ?? 0),
    queryFn: () => fetchEvaluationCriteria(academicPeriodId as number),
    enabled: academicPeriodId != null,
  })
}

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { EvaluationCriteriaOptions } from "@/features/establishment/academic-period/api/types/evaluation-criteria"

function fetchEvaluationCriteriaOptions(): Promise<EvaluationCriteriaOptions> {
  return api.get("/evaluation-criteria/options")
}

export const evaluationCriteriaOptionsQueryKey = () => [
  "evaluation-criteria-options",
]

// Las opciones de los selects son un catálogo estable (no cambian por
// periodo), así que las cacheamos indefinidamente como las demás listas.
export function useEvaluationCriteriaOptionsQuery() {
  return useQuery({
    queryKey: evaluationCriteriaOptionsQueryKey(),
    queryFn: fetchEvaluationCriteriaOptions,
    staleTime: Infinity,
  })
}

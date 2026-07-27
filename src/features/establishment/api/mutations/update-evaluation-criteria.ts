import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  EvaluationCriteria,
  MutationResult,
} from "../types/academic-period/evaluation-criteria"

interface UpdateEvaluationCriteriaInput {
  academicPeriodId: number
  values: EvaluationCriteria
}

function updateEvaluationCriteria({
  academicPeriodId,
  values,
}: UpdateEvaluationCriteriaInput): Promise<MutationResult> {
  return api.patch(`/evaluation-criteria/${academicPeriodId}`, values)
}

interface UseUpdateEvaluationCriteriaOptions {
  mutationConfig?: MutationConfig<typeof updateEvaluationCriteria>
}

export function useupdateEvaluationCriteria({
  mutationConfig,
}: UseUpdateEvaluationCriteriaOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateEvaluationCriteria,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-criteria"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

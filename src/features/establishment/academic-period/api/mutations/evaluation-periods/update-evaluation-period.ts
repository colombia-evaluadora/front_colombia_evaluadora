import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  UpdateEvaluationPeriodRequest,
} from "../../types/evaluation-period"

interface UpdateEvaluationPeriodInput {
  // PK real (path); el `codigo` de negocio va en el body dentro de `values`.
  id: number
  academicPeriodId?: number
  values: UpdateEvaluationPeriodRequest
}

function updateEvaluationPeriod({
  id,
  academicPeriodId,
  values,
}: UpdateEvaluationPeriodInput): Promise<MutationResult> {
  return api.patch(`/evaluation-periods/${id}`, {
    ...values,
    academicPeriodId,
  })
}

interface UseUpdateEvaluationPeriodOptions {
  mutationConfig?: MutationConfig<typeof updateEvaluationPeriod>
}

export function useUpdateEvaluationPeriod({
  mutationConfig,
}: UseUpdateEvaluationPeriodOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateEvaluationPeriod,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-periods"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

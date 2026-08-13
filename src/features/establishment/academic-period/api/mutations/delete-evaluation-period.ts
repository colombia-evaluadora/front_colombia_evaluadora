import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/types/evaluation-period"

interface DeleteEvaluationPeriodInput {
  academicPeriodId?: number
  codigo: number
}

function deleteEvaluationPeriod({
  academicPeriodId,
  codigo,
}: DeleteEvaluationPeriodInput): Promise<MutationResult> {
  const query =
    academicPeriodId != null ? `?academicPeriodId=${academicPeriodId}` : ""
  return api.delete(`/evaluation-periods/${codigo}${query}`)
}

interface UseDeleteEvaluationPeriodOptions {
  mutationConfig?: MutationConfig<typeof deleteEvaluationPeriod>
}

export function useDeleteEvaluationPeriod({
  mutationConfig,
}: UseDeleteEvaluationPeriodOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteEvaluationPeriod,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-periods"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

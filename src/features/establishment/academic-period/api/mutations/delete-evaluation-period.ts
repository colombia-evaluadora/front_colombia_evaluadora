import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { invalidateEvaluationPeriodRelated } from "./invalidate"

interface DeleteEvaluationPeriodInput {
  // PK real; el PK es único, así que no hace falta desambiguar por periodo.
  id: number
}

// `fn_periodo_eval_soft_delete`: soft delete expuesto como PUT.
function deleteEvaluationPeriod({
  id,
}: DeleteEvaluationPeriodInput): Promise<unknown> {
  return api.put(`/eval-col/periodo-evaluacion/${id}`)
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
      invalidateEvaluationPeriodRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/evaluation-period"

interface DeleteEvaluationPeriodInput {
  // PK real; el PK es único, así que no hace falta desambiguar por periodo.
  id: number
}

function deleteEvaluationPeriod({
  id,
}: DeleteEvaluationPeriodInput): Promise<MutationResult> {
  // `fn_periodo_eval_soft_delete` es un soft delete expuesto como PUT
  // (`PUT /periodo-evaluacion/:ID`), no como DELETE.
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
      queryClient.invalidateQueries({ queryKey: ["evaluation-periods"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

interface DeleteEvaluationPeriodInput {
  // PK real; el PK es único, así que no hace falta desambiguar por periodo.
  id: number
}

// `fn_periodo_eval_soft_delete` es un soft delete expuesto como PUT
// (`PUT /periodo-evaluacion/:ID`), no como DELETE. Devuelve
// `{rows: [{fn_periodo_eval_soft_delete: <id>}]}` (confirmado por
// ThunderClient); el front no necesita el valor, solo que la promesa resuelva.
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
      queryClient.invalidateQueries({ queryKey: ["evaluation-periods"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

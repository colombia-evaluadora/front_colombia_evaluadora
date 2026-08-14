import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/study-plan"

// `PUT /eval-col/plan-asignaturas/:ID/eliminar` (`fn_plan_eliminar`,
// id_query 74 — PUT desde V68).
function deleteStudyPlanItem(codigo: number): Promise<MutationResult> {
  return api.put(`/eval-col/plan-asignaturas/${codigo}/eliminar`)
}

interface UseDeleteStudyPlanItemOptions {
  mutationConfig?: MutationConfig<typeof deleteStudyPlanItem>
}

export function useDeleteStudyPlanItem({
  mutationConfig,
}: UseDeleteStudyPlanItemOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteStudyPlanItem,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["study-plans"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

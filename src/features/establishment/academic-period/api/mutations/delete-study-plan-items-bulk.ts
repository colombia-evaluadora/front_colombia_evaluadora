import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { BulkDeleteResult } from "@/features/establishment/academic-period/api/mutations/bulk-delete-result"

interface DeleteStudyPlanItemsBulkInput {
  ids: number[]
}

// `POST /eval-col/plan-asignaturas/bulk-delete` (`fn_plan_asignatura_bulk_delete`).
function deleteStudyPlanItemsBulk({ ids }: DeleteStudyPlanItemsBulkInput): Promise<BulkDeleteResult> {
  return api.post("/eval-col/plan-asignaturas/bulk-delete", { IDS: ids })
}

interface UseDeleteStudyPlanItemsBulkOptions {
  mutationConfig?: MutationConfig<typeof deleteStudyPlanItemsBulk>
}

export function useDeleteStudyPlanItemsBulk({
  mutationConfig,
}: UseDeleteStudyPlanItemsBulkOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteStudyPlanItemsBulk,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["study-plans"] })
      // Mismo motivo que en delete-study-plan.ts: las asignaturas eliminadas
      // vuelven a estar disponibles para agregarse de nuevo.
      queryClient.invalidateQueries({ queryKey: ["study-plan-available"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

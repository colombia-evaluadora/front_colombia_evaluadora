import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { BulkDeleteResult } from "@/features/establishment/academic-period/api/utils/bulk-delete-result"
import { invalidateStudyPlanRelated } from "./invalidate"

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
      invalidateStudyPlanRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

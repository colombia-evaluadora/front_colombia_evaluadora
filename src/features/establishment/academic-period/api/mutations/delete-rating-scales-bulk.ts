import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { BulkDeleteResult } from "@/features/establishment/academic-period/api/utils/bulk-delete-result"
import { invalidateRatingScaleRelated } from "./invalidate"

interface DeleteRatingScalesBulkInput {
  academicPeriodId: number
  teachingLevelIds: number[]
}

// `fn_escala_nivel_bulk_soft_delete` (id_query 55, V82): borra la escala completa por nivel.
function deleteRatingScalesBulk({
  academicPeriodId,
  teachingLevelIds,
}: DeleteRatingScalesBulkInput): Promise<BulkDeleteResult> {
  return api.post("/eval-col/escalas/bulk-delete", {
    PERIODO_ACADEMICO_ID: academicPeriodId,
    IDS: teachingLevelIds,
  })
}

interface UseDeleteRatingScalesBulkOptions {
  mutationConfig?: MutationConfig<typeof deleteRatingScalesBulk>
}

export function useDeleteRatingScalesBulk({
  mutationConfig,
}: UseDeleteRatingScalesBulkOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteRatingScalesBulk,
    ...mutationConfig,
    onSuccess: (...args) => {
      invalidateRatingScaleRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

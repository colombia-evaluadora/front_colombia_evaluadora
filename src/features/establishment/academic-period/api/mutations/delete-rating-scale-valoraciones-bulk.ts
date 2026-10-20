import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { BulkDeleteResult } from "@/features/establishment/academic-period/api/utils/bulk-delete-result"
import { invalidateRatingScaleRelated } from "./invalidate"

interface DeleteRatingScaleValoracionesBulkInput {
  ids: number[]
}

// `fn_escala_valoracion_bulk_delete` (id_query 146): borra bandas de una escala.
function deleteRatingScaleValoracionesBulk({
  ids,
}: DeleteRatingScaleValoracionesBulkInput): Promise<BulkDeleteResult> {
  return api.post("/eval-col/escalas/valoraciones/bulk-delete", { IDS: ids })
}

interface UseDeleteRatingScaleValoracionesBulkOptions {
  mutationConfig?: MutationConfig<typeof deleteRatingScaleValoracionesBulk>
}

export function useDeleteRatingScaleValoracionesBulk({
  mutationConfig,
}: UseDeleteRatingScaleValoracionesBulkOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteRatingScaleValoracionesBulk,
    ...mutationConfig,
    onSuccess: (...args) => {
      invalidateRatingScaleRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

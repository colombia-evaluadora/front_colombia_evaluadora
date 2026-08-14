import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/rating-scales"

// `POST /eval-col/escalas/bulk-delete` (`fn_escala_bulk_delete`, id_query 55
// — corregido en V66, antes leía `:PARAM.IDS` en una ruta sin esa variable y
// nunca borraba nada). El body espera `IDS`, no `ids`.
function deleteRatingScalesBulk(ids: number[]): Promise<MutationResult> {
  return api.post("/eval-col/escalas/bulk-delete", { IDS: ids })
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
      queryClient.invalidateQueries({ queryKey: ["rating-scales"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

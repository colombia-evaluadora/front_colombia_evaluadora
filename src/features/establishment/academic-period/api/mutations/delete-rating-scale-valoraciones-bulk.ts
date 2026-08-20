import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { BulkDeleteResult } from "@/features/establishment/academic-period/api/mutations/bulk-delete-result"

interface DeleteRatingScaleValoracionesBulkInput {
  ids: number[]
}

// `POST /eval-col/escalas/valoraciones/bulk-delete`
// (`fn_escala_valoracion_bulk_delete`, id_query 146) — a diferencia de
// `deleteRatingScalesBulk` (que borra la escala COMPLETA de un nivel de
// enseñanza), esto borra un subconjunto de bandas (`TESCALA_VALORACION`)
// dentro de una misma escala, por su PK.
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
      queryClient.invalidateQueries({ queryKey: ["rating-scales"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

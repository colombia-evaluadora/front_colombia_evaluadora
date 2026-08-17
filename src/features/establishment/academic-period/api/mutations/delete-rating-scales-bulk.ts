import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { BulkDeleteResult } from "@/features/establishment/academic-period/api/mutations/bulk-delete-result"

interface DeleteRatingScalesBulkInput {
  academicPeriodId: number
  teachingLevelIds: number[]
}

// `POST /eval-col/escalas/bulk-delete` (`fn_escala_nivel_bulk_soft_delete`,
// id_query 55 — corregido en V82: antes llamaba a `fn_escala_bulk_delete`,
// que solo borraba las bandas de valoración de un nivel y dejaba
// TNIVEL_ESCALA/TESCALA activos ("escala fantasma"). Ahora borra la escala
// completa por nivel. El body espera `PERIODO_ACADEMICO_ID` e `IDS`
// (ids de nivel de enseñanza), no `ids` de banda.
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
      queryClient.invalidateQueries({ queryKey: ["rating-scales"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

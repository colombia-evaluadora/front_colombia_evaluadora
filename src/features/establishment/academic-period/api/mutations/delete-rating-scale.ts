import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/rating-scales"

// `PUT /eval-col/escalas/:ID` (`fn_escala_eliminar`, id_query 54) — DELETE no
// está permitido en el catálogo del SSO (`ck_query_http_method` solo admite
// GET/POST/PUT/PATCH).
function deleteRatingScale(codigo: number): Promise<MutationResult> {
  return api.put(`/eval-col/escalas/${codigo}`)
}

interface UseDeleteRatingScaleOptions {
  mutationConfig?: MutationConfig<typeof deleteRatingScale>
}

export function useDeleteRatingScale({
  mutationConfig,
}: UseDeleteRatingScaleOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteRatingScale,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["rating-scales"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

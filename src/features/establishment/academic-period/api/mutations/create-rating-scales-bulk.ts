import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { BulkCreateRatingScalesRequest } from "@/features/establishment/academic-period/api/types/rating-scales"
import { resolveRatingScaleRefs } from "@/features/establishment/academic-period/api/mutations/resolve-rating-scale-refs"
import { invalidateRatingScaleRelated } from "./invalidate"

// `fn_escala_guardar_bulk` (id_query 53); devuelve la cantidad creada.
async function createRatingScalesBulk(
  input: BulkCreateRatingScalesRequest
): Promise<number> {
  const refs = await resolveRatingScaleRefs(input.scales)
  return api.post("/eval-col/escalas", {
    ACADEMIC_PERIOD_ID: input.academicPeriodId,
    TEACHING_LEVEL_IDS: input.teachingLevelIds,
    // `CAST(:BODY.SCALES AS JSONB)` espera el JSON como string.
    SCALES: JSON.stringify(
      input.scales.map((scale, i) => ({
        nombre: scale.nombre,
        abreviacion: scale.abreviacion,
        tipoId: refs[i].tipoId,
        iconoId: refs[i].iconoId,
        iconoCategoria: refs[i].iconoCategoria,
        notaMaxima: scale.notaMaxima,
        notaMinima: scale.notaMinima,
        notaEquivalente: scale.notaEquivalente,
      }))
    ),
  })
}

interface UseCreateRatingScalesBulkOptions {
  mutationConfig?: MutationConfig<typeof createRatingScalesBulk>
}

export function useCreateRatingScalesBulk({
  mutationConfig,
}: UseCreateRatingScalesBulkOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createRatingScalesBulk,
    ...mutationConfig,
    onSuccess: (...args) => {
      invalidateRatingScaleRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

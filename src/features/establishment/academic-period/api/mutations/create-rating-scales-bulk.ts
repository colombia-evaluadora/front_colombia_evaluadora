import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { BulkCreateRatingScalesRequest } from "@/features/establishment/academic-period/api/types/rating-scales"
import { resolveRatingScaleRefs } from "@/features/establishment/academic-period/api/mutations/resolve-rating-scale-refs"

// Body PLANO con las llaves de `fn_escala_guardar_bulk`
// (`POST /eval-col/escalas`, id_query 53). Devuelve la cantidad de
// valoraciones creadas (no las filas), a diferencia del mock — nada la
// consume hoy (ver tab-rating-scales.tsx / dialog-create-rating-scale.tsx,
// solo usan onSuccess/onError).
async function createRatingScalesBulk(
  input: BulkCreateRatingScalesRequest
): Promise<number> {
  const refs = await resolveRatingScaleRefs(input.scales)
  return api.post("/eval-col/escalas", {
    ACADEMIC_PERIOD_ID: input.academicPeriodId,
    TEACHING_LEVEL_IDS: input.teachingLevelIds,
    // `CAST(:BODY.SCALES AS JSONB)` espera el valor como STRING de JSON, no
    // como objeto anidado — confirmado contra Postman. Si se manda el array
    // sin stringify, el binder no lo castea bien a JSONB.
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
      queryClient.invalidateQueries({ queryKey: ["rating-scales"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

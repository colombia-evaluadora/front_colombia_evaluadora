import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  UpdateRatingScaleRequest,
} from "@/features/establishment/academic-period/api/types/rating-scales"
import { resolveRatingScaleRefs } from "@/features/establishment/academic-period/api/mutations/resolve-rating-scale-refs"
import { invalidateRatingScaleRelated } from "./invalidate"

interface UpdateRatingScaleInput {
  codigo: number
  academicPeriodId: number
  values: UpdateRatingScaleRequest
}

// Sin `fn_escala_actualizar`: editar = borrar y recrear (multi-nivel puede dejar huérfanas).
async function updateRatingScale({
  codigo,
  academicPeriodId,
  values,
}: UpdateRatingScaleInput): Promise<MutationResult> {
  await api.put(`/eval-col/escalas/${codigo}`)
  const [refs] = await resolveRatingScaleRefs([values])
  return api.post("/eval-col/escalas", {
    ACADEMIC_PERIOD_ID: academicPeriodId,
    TEACHING_LEVEL_IDS: values.teachingLevelIds,
    // Ver create-rating-scales-bulk.ts: JSONB espera STRING, no array anidado.
    SCALES: JSON.stringify([
      {
        nombre: values.nombre,
        abreviacion: values.abreviacion,
        tipoId: refs.tipoId,
        iconoId: refs.iconoId,
        iconoCategoria: refs.iconoCategoria,
        notaMaxima: values.notaMaxima,
        notaMinima: values.notaMinima,
        notaEquivalente: values.notaEquivalente,
      },
    ]),
  })
}

interface UseUpdateRatingScaleOptions {
  mutationConfig?: MutationConfig<typeof updateRatingScale>
}

export function useUpdateRatingScale({ mutationConfig }: UseUpdateRatingScaleOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateRatingScale,
    ...mutationConfig,
    onSuccess: (...args) => {
      invalidateRatingScaleRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

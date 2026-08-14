import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  UpdateRatingScaleRequest,
} from "@/features/establishment/academic-period/api/types/rating-scales"
import { resolveRatingScaleRefs } from "@/features/establishment/academic-period/api/mutations/resolve-rating-scale-refs"

interface UpdateRatingScaleInput {
  codigo: number
  academicPeriodId: number
  values: UpdateRatingScaleRequest
}

// No existe `fn_escala_actualizar` en el backend (solo alta en lote y borrado
// individual/masivo) — "editar" se resuelve como borrar la valoración vieja
// (`fn_escala_eliminar`, PUT /eval-col/escalas/:ID) y crear la nueva con los
// datos editados (`fn_escala_guardar_bulk`, POST /eval-col/escalas). El
// `codigo`/id cambia (ya no es la misma fila).
//
// Nota: `values.teachingLevelIds` puede traer más de un nivel si la escala
// fue creada agrupada (vía el diálogo de alta masiva); acá solo se borra el
// `codigo` recibido (una fila) pero se recrea para TODOS esos niveles, así
// que una escala agrupada en varios niveles puede quedar con filas viejas
// huérfanas en los niveles que no sean `codigo`. El flujo normal de edición
// en línea (`ScalesSubTable` en tab-rating-scales.tsx) siempre crea escalas
// de un solo nivel, así que este caso no aplica en la práctica — pero si
// aparecen valoraciones duplicadas tras editar una escala multi-nivel, es
// por esto.
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

export function useUpdateRatingScale({
  mutationConfig,
}: UseUpdateRatingScaleOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateRatingScale,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["rating-scales"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

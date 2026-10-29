import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

interface DeleteCriterioUnidadInput {
  unidadId: number
  criterioId: number
}

/**
 * `PATCH /planeador/unidades/criterios/:id` (sso V492.4,
 * `fn_unidad_criterio_eliminar`): baja lógica del criterio y sus niveles, sin
 * body. Mismo gate de autoría que editar (42501 si el docente puro no es el
 * autor). Las calificaciones no referencian el criterio de la unidad (solo
 * `TACTIVIDAD_CRITERIO_UNIDAD`, el vínculo con actividades), así que no hay
 * bloqueo por notas.
 */
function deleteCriterioUnidad({ criterioId }: DeleteCriterioUnidadInput): Promise<unknown> {
  return api.patch(`/eval-col/planeador/unidades/criterios/${criterioId}`)
}

export function useDeleteCriterioUnidad({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof deleteCriterioUnidad> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: deleteCriterioUnidad,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: planeadorKeys.unidad.criterios(args[1].unidadId) })
      onSuccess?.(...args)
    },
  })
}

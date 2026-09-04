import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { unidadDetalleQueryKey } from "@/features/planeador/api/query/use-unidades-query"
import type { CriterioUnidad } from "@/features/planeador/api/types/unidad-tematica"

interface AddCriterioInput {
  unidadId: string
  criterio: Omit<CriterioUnidad, "id">
}

interface AddCriterioResponse {
  status: "ok" | "error"
  message?: string
  criterio?: CriterioUnidad
}

function addCriterioUnidad({ unidadId, criterio }: AddCriterioInput): Promise<AddCriterioResponse> {
  return api.post(`/eval-col/planeador/unidad/${unidadId}/criterio`, criterio)
}

interface UseAddCriterioUnidadOptions {
  mutationConfig?: MutationConfig<typeof addCriterioUnidad>
}

/**
 * Agrega un criterio a la rúbrica de una unidad. Invalida el detalle de esa
 * unidad —no el listado, que no muestra criterios— para que la tabla de
 * "Rúbricas" del panel refleje el nuevo criterio apenas se cierra el diálogo.
 */
export function useAddCriterioUnidad({ mutationConfig }: UseAddCriterioUnidadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: addCriterioUnidad,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: unidadDetalleQueryKey(variables.unidadId) })
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}

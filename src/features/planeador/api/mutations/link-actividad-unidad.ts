import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { unidadDetalleQueryKey } from "@/features/planeador/api/query/use-unidades-query"
import type { UnidadActividad } from "@/features/planeador/api/types/unidad-tematica"

interface LinkActividadInput {
  unidadId: string
  actividad: Omit<UnidadActividad, "id">
}

interface LinkActividadResponse {
  status: "ok" | "error"
  message?: string
  actividad?: UnidadActividad
}

function linkActividadUnidad({
  unidadId,
  actividad,
}: LinkActividadInput): Promise<LinkActividadResponse> {
  return api.post(`/eval-col/planeador/unidad/${unidadId}/actividad`, actividad)
}

interface UseLinkActividadUnidadOptions {
  mutationConfig?: MutationConfig<typeof linkActividadUnidad>
}

/**
 * Vincula una actividad ya existente a una unidad, con su peso dentro de
 * ella. Invalida el detalle de esa unidad para que la tabla de
 * "Actividades" y el cálculo de "% disponible" del diálogo reflejen el
 * nuevo vínculo apenas se confirma.
 */
export function useLinkActividadUnidad({ mutationConfig }: UseLinkActividadUnidadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: linkActividadUnidad,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: unidadDetalleQueryKey(variables.unidadId) })
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}

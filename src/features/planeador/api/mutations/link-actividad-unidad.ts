import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { unidadDetalleQueryKey } from "@/features/planeador/api/query/use-unidades-query"
import type { UnidadActividad } from "@/features/planeador/api/types/unidad-tematica"

interface LinkActividadInput {
  unidadId: number
  /** `actividadId` viaja en el path (`PUT .../actividades/:actividadId`),
   *  no en el body — mismo criterio que `fn_unidad_actividad_vincular` real. */
  actividad: Omit<UnidadActividad, "id" | "actividadId"> & { actividadId: number }
}

interface LinkActividadResponse {
  status: "ok" | "error"
  message?: string
  actividad?: UnidadActividad
}

function linkActividadUnidad({
  unidadId,
  actividad: { actividadId, ...body },
}: LinkActividadInput): Promise<LinkActividadResponse> {
  return api.put(`/eval-col/planeador/unidades/${unidadId}/actividades/${actividadId}`, body)
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

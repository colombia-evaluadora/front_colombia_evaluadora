import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { unidadDetalleQueryKey } from "@/features/planeador/api/query/use-unidades-query"

interface LinkActividadInput {
  unidadId: number
  actividadId: number
  /** `null` no toca el peso actual (semántica real de `PONDERACION` NULL) —
   *  siempre se manda un número acá porque el modal de vincular no ofrece
   *  "dejarlo como estaba" para una actividad que recién se vincula. */
  ponderacion: number
  /** Obligatorio en `true` solo si la actividad YA estaba vinculada a OTRA
   *  unidad — vincular una huérfana no lo necesita. El modal actual (ver
   *  `DialogAgregarActividad`) solo ofrece huérfanas, así que siempre manda
   *  `false`; queda como parámetro para cuando ofrezca mover de unidad. */
  permitirMoverDeUnidad?: boolean
}

interface LinkActividadResponse {
  status?: "ok" | "error"
  message?: string
}

function linkActividadUnidad({
  unidadId,
  actividadId,
  ponderacion,
  permitirMoverDeUnidad,
}: LinkActividadInput): Promise<LinkActividadResponse> {
  return api.put(`/eval-col/planeador/unidades/${unidadId}/actividades/${actividadId}`, {
    PONDERACION: ponderacion,
    PERMITIR_MOVER_DE_UNIDAD: permitirMoverDeUnidad ?? false,
  })
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

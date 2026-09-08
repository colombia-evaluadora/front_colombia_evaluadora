import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { unidadDetalleQueryKey } from "@/features/planeador/api/query/use-unidades-query"

// `PATCH`, no `DELETE` — mismo motor que el resto de soft-deletes del
// Planeador. Sin body: el `:actividadId` en el path alcanza.
function unlinkActividadUnidad(actividadId: number): Promise<void> {
  return api.patch(`/eval-col/planeador/unidades/actividades/${actividadId}`)
}

interface UseUnlinkActividadUnidadOptions {
  /** Detalle de la unidad a invalidar tras desvincular — se pasa acá (no se
   *  puede derivar del id de la actividad) para que la tabla de
   *  "Actividades" refleje la baja apenas se confirma. */
  unidadId: number
  mutationConfig?: MutationConfig<typeof unlinkActividadUnidad>
}

/**
 * Desvincula una actividad de su unidad: `FK_TUNIDAD`/`PONDERACION` quedan
 * en NULL y vuelve a aparecer como huérfana (`GET /actividades/huerfanas`).
 */
export function useUnlinkActividadUnidad({
  unidadId,
  mutationConfig,
}: UseUnlinkActividadUnidadOptions) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: unlinkActividadUnidad,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: unidadDetalleQueryKey(unidadId) })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}

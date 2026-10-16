import { useMutation, useQueryClient } from "@tanstack/react-query"
import { writeConfig, type WriteRequest } from "@/lib/offline/outbox/write-request"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

// `PATCH`, no `DELETE` — mismo motor que el resto de soft-deletes del
// Planeador. Sin body: el `:actividadId` en el path alcanza.
export function unlinkActividadUnidad(actividadId: number, req?: WriteRequest): Promise<void> {
  return api.patch(`/eval-col/planeador/unidades/actividades/${actividadId}`, undefined, writeConfig(req))
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
    mutationFn: (actividadId: number) => unlinkActividadUnidad(actividadId),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: planeadorKeys.unidad.detalle(unidadId) })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}

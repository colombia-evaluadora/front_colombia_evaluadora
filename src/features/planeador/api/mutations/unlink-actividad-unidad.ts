import { useMutation, useQueryClient } from "@tanstack/react-query"
import { writeConfig, type WriteRequest } from "@/lib/offline/outbox/write-request"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { invalidarVinculoActividadUnidad } from "@/features/planeador/api/query/invalidar-listados-actividades"

// `PATCH`, no `DELETE` — mismo motor que el resto de soft-deletes del
// Planeador. Sin body: el `:actividadId` en el path alcanza.
export function unlinkActividadUnidad(actividadId: number, req?: WriteRequest): Promise<void> {
  return api.patch(`/eval-col/planeador/unidades/actividades/${actividadId}`, undefined, writeConfig(req))
}

interface UseUnlinkActividadUnidadOptions {
  mutationConfig?: MutationConfig<typeof unlinkActividadUnidad>
}

/**
 * Desvincula una actividad de su unidad: `FK_TUNIDAD`/`PONDERACION` quedan
 * en NULL y vuelve a aparecer como huérfana (`GET /actividades/huerfanas`).
 */
export function useUnlinkActividadUnidad({ mutationConfig }: UseUnlinkActividadUnidadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: (actividadId: number) => unlinkActividadUnidad(actividadId),
    onSuccess: (data, actividadId, ...rest) => {
      invalidarVinculoActividadUnidad(queryClient, actividadId)
      onSuccess?.(data, actividadId, ...rest)
    },
    ...restConfig,
  })
}

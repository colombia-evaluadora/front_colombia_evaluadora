import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { unidadDetalleQueryKey } from "@/features/planeador/api/query/use-unidades-query"

interface UpdatePonderacionInput {
  actividadId: number
  /** 0-100. El backend rechaza el request si la unidad calcula por
   *  "Promedio simple"/"Suma de puntos" — ahí el % no se edita a mano. */
  ponderacion: number
}

function updatePonderacionActividadUnidad({
  actividadId,
  ponderacion,
}: UpdatePonderacionInput): Promise<void> {
  return api.put(`/eval-col/planeador/unidades/actividades/${actividadId}/ponderacion`, {
    PONDERACION: ponderacion,
  })
}

interface UseUpdatePonderacionActividadUnidadOptions {
  unidadId: number
  mutationConfig?: MutationConfig<typeof updatePonderacionActividadUnidad>
}

/**
 * Edición rápida (inline) del peso de una actividad ya vinculada, sin pasar
 * por el form completo de la actividad — la columna "(%)" de la tabla de
 * Actividades de la unidad.
 */
export function useUpdatePonderacionActividadUnidad({
  unidadId,
  mutationConfig,
}: UseUpdatePonderacionActividadUnidadOptions) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: updatePonderacionActividadUnidad,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: unidadDetalleQueryKey(unidadId) })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}

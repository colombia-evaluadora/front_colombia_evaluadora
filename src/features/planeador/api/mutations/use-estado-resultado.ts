import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { calificacionesQueryKey } from "@/features/planeador/api/query/use-calificaciones-query"
import { planillaCalificacionesQueryKeyPrefix } from "@/features/planeador/api/query/use-planilla-calificaciones-query"

/**
 * Regla 62: marca No presentó o lo quita (vuelve a Pendiente):
 * `PUT /planeador/actividades/estudiantes/:ID/estado-resultado`.
 * No presentó exige que no haya nota; No asistido no se marca a mano.
 */
export interface EstadoResultadoInput {
  actividadId: number
  /** `PK_TACTIVIDAD_ESTUDIANTE`. */
  pkTactividadEstudiante: number
  estado: "NO_PRESENTO" | "PENDIENTE"
}

function marcarEstadoResultado(input: EstadoResultadoInput): Promise<unknown> {
  return evalCol.putRow(`/planeador/actividades/estudiantes/${input.pkTactividadEstudiante}/estado-resultado`, {
    ESTADO: input.estado,
  })
}

export function useEstadoResultadoMutation(
  options: { mutationConfig?: MutationConfig<typeof marcarEstadoResultado> } = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: marcarEstadoResultado,
    ...options.mutationConfig,
    onSuccess: (...args) => {
      const [, input] = args
      queryClient.invalidateQueries({ queryKey: calificacionesQueryKey(input.actividadId) })
      queryClient.invalidateQueries({ queryKey: planillaCalificacionesQueryKeyPrefix() })
      options.mutationConfig?.onSuccess?.(...args)
    },
  })
}

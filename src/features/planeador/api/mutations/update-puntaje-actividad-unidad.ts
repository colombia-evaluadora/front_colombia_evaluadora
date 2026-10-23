import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { invalidarVinculoActividadUnidad } from "@/features/planeador/api/query/invalidar-listados-actividades"

interface UpdatePuntajeInput {
  actividadId: number
  /** `TACTIVIDAD.NOTA_MAXIMA` — lo que el docente captura a mano en una
   *  unidad "Suma de puntos" (ver el comentario de `UnidadActividad.
   *  notaMaxima`). No hay tope: el backend deriva el % de forma
   *  proporcional sobre el total de puntajes del (unidad, grupo). */
  puntaje: number
}

/** No hay endpoint dedicado (a diferencia de `.../ponderacion`, V223): el
 *  mismo `PUT /planeador/actividades/:id` (`fn_actividad_actualizar`, V224)
 *  ya acepta `NOTA_MAXIMA` como PATCH parcial y dispara el recalculo de
 *  `fn_unidad_ponderacion_recalcular_sumatoria` — ver `update-actividad.ts`. */
function updatePuntajeActividadUnidad({ actividadId, puntaje }: UpdatePuntajeInput): Promise<void> {
  return api.put(`/eval-col/planeador/actividades/${actividadId}`, {
    NOTA_MAXIMA: puntaje,
  })
}

interface UseUpdatePuntajeActividadUnidadOptions {
  mutationConfig?: MutationConfig<typeof updatePuntajeActividadUnidad>
}

/**
 * Edición rápida (inline) del puntaje de una actividad ya vinculada a una
 * unidad "Suma de puntos", sin pasar por el form completo — la columna
 * "Puntaje" de la tabla de Actividades de la unidad. Espejo de
 * `useUpdatePonderacionActividadUnidad`, que cubre el mismo rol para
 * unidades "Ponderado".
 */
export function useUpdatePuntajeActividadUnidad({ mutationConfig }: UseUpdatePuntajeActividadUnidadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: updatePuntajeActividadUnidad,
    onSuccess: (data, variables, ...rest) => {
      invalidarVinculoActividadUnidad(queryClient, variables.actividadId)
      onSuccess?.(data, variables, ...rest)
    },
    ...restConfig,
  })
}

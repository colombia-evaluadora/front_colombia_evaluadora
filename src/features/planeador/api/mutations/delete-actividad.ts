import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportResult } from "@/features/planeador/api/types/actividad"

import { invalidarListadosActividades } from "@/features/planeador/api/query/invalidar-listados-actividades"

// `PATCH`, no `DELETE` — el motor real no admite ese verbo (soft-delete).
// El backend puede rechazarla con 409/22023 (`fn_actividad_validar_sin_*`,
// V482) si la actividad ya tiene notas, observaciones, capturas de
// instrumento, asistencia o recuperaciones asociadas — ver
// `DialogDeleteActividad`, que muestra ese mensaje real en vez de uno
// genérico.
function deleteActividad(id: number): Promise<ExportResult> {
  return api.patch(`/eval-col/planeador/actividades/${id}`)
}

interface UseDeleteActividadOptions {
  mutationConfig?: MutationConfig<typeof deleteActividad>
}

export function useDeleteActividad({ mutationConfig }: UseDeleteActividadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: deleteActividad,
    onSuccess: (data, id, ...rest) => {
      // Refresca rail, calendario y cards de resumen para que la card
      // desaparezca al volver al Planeador. Antes esto invalidaba
      // `["actividad"]` (sin la "es"), que no matchea ninguna key real — el
      // listado quedaba mostrando la actividad borrada hasta que el
      // `staleTime` (30s) expiraba solo. También invalida el detalle: si el
      // docente reabre esa misma actividad por URL directa, no debe ver
      // datos obsoletos mientras el backend resuelve el 404/soft-delete.
      invalidarListadosActividades(queryClient, { detalleId: id })
      onSuccess?.(data, id, ...rest)
    },
    ...restConfig,
  })
}

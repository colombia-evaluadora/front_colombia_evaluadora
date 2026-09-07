import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportResult } from "@/features/planeador/api/types/actividad"

// `PATCH`, no `DELETE` — el motor real no admite ese verbo (soft-delete).
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
    onSuccess: (...args) => {
      // Invalida el listado para que la card desaparezca al volver al
      // Planeador. No tocamos el detalle: la ruta de edición es aparte.
      queryClient.invalidateQueries({ queryKey: ["actividad"] })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { unidadesQueryKey } from "@/features/planeador/api/query/use-unidades-query"
import type { ExportResult } from "@/features/planeador/api/types/actividad"

// `PATCH`, no `DELETE` — el motor real no admite ese verbo (soft-delete).
function deleteUnidad(id: number): Promise<ExportResult> {
  return api.patch(`/eval-col/planeador/unidades/${id}`)
}

interface UseDeleteUnidadOptions {
  mutationConfig?: MutationConfig<typeof deleteUnidad>
}

export function useDeleteUnidad({ mutationConfig }: UseDeleteUnidadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: deleteUnidad,
    onSuccess: (...args) => {
      // Invalida el listado para que la unidad desaparezca del rail al
      // volver a la pestaña (mismo criterio que `useDeleteActividad`).
      queryClient.invalidateQueries({ queryKey: unidadesQueryKey() })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}

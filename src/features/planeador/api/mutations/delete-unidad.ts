import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { unidadesQueryKey } from "@/features/planeador/api/query/use-unidades-query"
import type { ExportResult } from "@/features/planeador/api/types/actividad"

function deleteUnidad(id: string): Promise<ExportResult> {
  return api.delete(`/eval-col/planeador/unidad/${id}`)
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

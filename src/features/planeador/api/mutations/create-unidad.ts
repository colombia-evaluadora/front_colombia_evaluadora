import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { unidadesQueryKey } from "@/features/planeador/api/query/use-unidades-query"
import type { UnidadInfoGeneral } from "@/features/planeador/api/mutations/update-unidad"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"

function createUnidad(data: UnidadInfoGeneral): Promise<UnidadTematica> {
  return api.post("/eval-col/planeador/unidades", data)
}

interface UseCreateUnidadOptions {
  mutationConfig?: MutationConfig<typeof createUnidad>
}

export function useCreateUnidad({ mutationConfig }: UseCreateUnidadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: createUnidad,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: unidadesQueryKey() })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}

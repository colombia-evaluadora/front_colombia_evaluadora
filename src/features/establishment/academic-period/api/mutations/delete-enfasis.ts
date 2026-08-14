import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

// ⚠️ Endpoint todavía sin backend — se está armando en paralelo. Path calca
// el patrón de `fn_area_soft_delete` (PUT /eval-col/areas/eliminar/:ID)
// mientras se confirma el real; ajustar cuando esté.
function deleteEnfasis(id: number): Promise<unknown> {
  return api.put(`/eval-col/enfasis/eliminar/${id}`)
}

interface UseDeleteEnfasisOptions {
  mutationConfig?: MutationConfig<typeof deleteEnfasis>
}

export function useDeleteEnfasis({
  mutationConfig,
}: UseDeleteEnfasisOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteEnfasis,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["especialidades"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

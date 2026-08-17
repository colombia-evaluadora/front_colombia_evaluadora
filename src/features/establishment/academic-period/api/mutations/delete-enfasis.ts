import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

// `PUT /eval-col/enfasis/eliminar/:ID` (`fn_enfasis_soft_delete`, id_query 104).
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

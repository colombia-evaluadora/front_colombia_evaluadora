import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MatriculaMutationResult } from "@/features/coverage/api/types/matricula"

function retireMatricula(id: string): Promise<MatriculaMutationResult> {
  return api.post(`/coverage/matricula/${id}/retirar`, {})
}

interface UseRetireMatriculaOptions {
  mutationConfig?: MutationConfig<typeof retireMatricula>
}

export function useRetireMatricula({ mutationConfig }: UseRetireMatriculaOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: retireMatricula,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["matricula"] })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}

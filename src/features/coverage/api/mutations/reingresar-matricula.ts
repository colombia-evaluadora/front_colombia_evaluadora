import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MatriculaMutationResult } from "@/features/coverage/api/types/matricula"

function reingresarMatricula(id: string): Promise<MatriculaMutationResult> {
  return api.post(`/coverage/matricula/${id}/reingresar`, {})
}

interface UseReingresarMatriculaOptions {
  mutationConfig?: MutationConfig<typeof reingresarMatricula>
}

export function useReingresarMatricula({ mutationConfig }: UseReingresarMatriculaOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: reingresarMatricula,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["matricula"] })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}

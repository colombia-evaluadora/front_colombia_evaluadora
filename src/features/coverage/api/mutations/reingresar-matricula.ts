import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MatriculaMutationResult } from "@/features/coverage/api/types/matricula"

// `PUT /eval-col/cobertura-academica/matricula/:id/reingresar` -- sin body,
// mismo criterio que `delete-matricula.ts`.
function reingresarMatricula(id: string): Promise<MatriculaMutationResult> {
  return api.put(`/eval-col/cobertura-academica/matricula/${id}/reingresar`)
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

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MatriculaMutationResult } from "@/features/coverage/matricula/api/types/matricula"
import { invalidarMatriculas } from "@/features/coverage/matricula/api/query-keys"

// `PUT /eval-col/cobertura-academica/matricula/:id/retirar` -- sin body,
// mismo criterio que `delete-matricula.ts`.
function retireMatricula(id: string): Promise<MatriculaMutationResult> {
  return api.put(`/eval-col/cobertura-academica/matricula/${id}/retirar`)
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
      invalidarMatriculas(queryClient)
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}

// Retirar en lote: una sola recarga al final, no una por estudiante.
export function useRetireMatriculas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => Promise.allSettled(ids.map(retireMatricula)),
    onSettled: () => invalidarMatriculas(queryClient),
  })
}

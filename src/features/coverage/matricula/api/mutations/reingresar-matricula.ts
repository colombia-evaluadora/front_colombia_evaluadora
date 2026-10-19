import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MatriculaMutationResult } from "@/features/coverage/matricula/api/types/matricula"
import { invalidarMatriculas } from "@/features/coverage/matricula/api/query-keys"

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
      invalidarMatriculas(queryClient)
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}

// Reingresar en lote: una sola recarga al final, no una por estudiante.
export function useReingresarMatriculas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => Promise.allSettled(ids.map(reingresarMatricula)),
    onSettled: () => invalidarMatriculas(queryClient),
  })
}

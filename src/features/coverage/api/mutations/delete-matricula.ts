import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportResult } from "@/features/coverage/api/types/matricula"

function deleteMatricula(id: string): Promise<ExportResult> {
  return api.put(`/eval-col/cobertura-academica/matricula/${id}`)
}

interface UseDeleteMatriculaOptions {
  mutationConfig?: MutationConfig<typeof deleteMatricula>
}

export function useDeleteMatricula({ mutationConfig }: UseDeleteMatriculaOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: deleteMatricula,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["matricula"] })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}

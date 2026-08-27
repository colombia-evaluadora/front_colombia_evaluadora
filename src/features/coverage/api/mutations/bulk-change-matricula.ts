import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  BulkMatriculaChangeRequest,
  BulkMatriculaChangeResult,
} from "@/features/coverage/api/types/matricula"

function bulkChangeMatricula(body: BulkMatriculaChangeRequest): Promise<BulkMatriculaChangeResult> {
  return api.post("/coverage/matricula/cambio-masivo", body)
}

interface UseBulkChangeMatriculaOptions {
  mutationConfig?: MutationConfig<typeof bulkChangeMatricula>
}

export function useBulkChangeMatricula({ mutationConfig }: UseBulkChangeMatriculaOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: bulkChangeMatricula,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["matricula"] })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}

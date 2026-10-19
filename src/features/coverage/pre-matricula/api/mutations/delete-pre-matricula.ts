import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

export interface DeletePreMatriculaResult {
  status: "ok" | "error"
  message: string
}

function deletePreMatricula(id: string): Promise<DeletePreMatriculaResult> {
  return api.delete(`/coverage/pre-matricula/${id}`)
}

interface UseDeletePreMatriculaOptions {
  mutationConfig?: MutationConfig<typeof deletePreMatricula>
}

export function useDeletePreMatricula({ mutationConfig }: UseDeletePreMatriculaOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deletePreMatricula,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["pre-matricula"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { PreMatricula } from "@/features/coverage/api/types/pre-matricula"

export interface UpdatePreMatriculaResult {
  status: "ok" | "error"
  message: string
}

function updatePreMatricula(preMatricula: PreMatricula): Promise<UpdatePreMatriculaResult> {
  const { id, ...changes } = preMatricula
  return api.put(`/coverage/pre-matricula/${id}`, changes)
}

interface UseUpdatePreMatriculaOptions {
  mutationConfig?: MutationConfig<typeof updatePreMatricula>
}

export function useUpdatePreMatricula({ mutationConfig }: UseUpdatePreMatriculaOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updatePreMatricula,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["pre-matricula"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

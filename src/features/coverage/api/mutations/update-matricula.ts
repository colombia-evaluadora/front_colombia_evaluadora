import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { CreateMatriculaInput, MatriculaMutationResult } from "@/features/coverage/api/types/matricula"

function updateMatricula({
  id,
  values,
}: {
  id: string
  values: CreateMatriculaInput
}): Promise<MatriculaMutationResult> {
  return api.put(`/coverage/matricula/${id}`, values)
}

interface UseUpdateMatriculaOptions {
  mutationConfig?: MutationConfig<typeof updateMatricula>
}

export function useUpdateMatricula({ mutationConfig }: UseUpdateMatriculaOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: updateMatricula,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["matricula"] })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}

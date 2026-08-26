import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { CreateMatriculaInput, CreateMatriculaResult } from "@/features/coverage/api/types/matricula"

function createMatricula(input: CreateMatriculaInput): Promise<CreateMatriculaResult> {
  return api.post("/coverage/matricula", input)
}

interface UseCreateMatriculaOptions {
  mutationConfig?: MutationConfig<typeof createMatricula>
}

export function useCreateMatricula({ mutationConfig }: UseCreateMatriculaOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: createMatricula,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["matricula"] })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MatriculaFieldConfigMap,
  MatriculaFieldConfigResult,
} from "@/features/coverage/api/types/matricula"

function updateMatriculaFieldConfig(fields: MatriculaFieldConfigMap): Promise<MatriculaFieldConfigResult> {
  return api.put("/coverage/matricula/config", fields)
}

interface UseUpdateMatriculaFieldConfigOptions {
  mutationConfig?: MutationConfig<typeof updateMatriculaFieldConfig>
}

export function useUpdateMatriculaFieldConfig({
  mutationConfig,
}: UseUpdateMatriculaFieldConfigOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: updateMatriculaFieldConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["matricula", "field-config"] })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}

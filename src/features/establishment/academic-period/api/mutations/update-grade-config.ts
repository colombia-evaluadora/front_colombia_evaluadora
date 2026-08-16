import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  GradeConfig,
  MutationResult,
} from "@/features/establishment/academic-period/api/types/grade-config"

interface UpdateGradeConfigInput {
  gradeId: number
  values: GradeConfig
}

function updateGradeConfig({ gradeId, values }: UpdateGradeConfigInput): Promise<MutationResult> {
  return api.patch(`/grades/${gradeId}/config`, values)
}

interface UseUpdateGradeConfigOptions {
  mutationConfig?: MutationConfig<typeof updateGradeConfig>
}

export function useUpdateGradeConfig({ mutationConfig }: UseUpdateGradeConfigOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateGradeConfig,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["grade-config"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

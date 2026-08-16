import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  UpdateGradeGroupRequest,
} from "@/features/establishment/academic-period/api/types/grade-group"

interface UpdateGradeGroupInput {
  codigo: string
  values: UpdateGradeGroupRequest
}

function updateGradeGroup({ codigo, values }: UpdateGradeGroupInput): Promise<MutationResult> {
  return api.patch(`/grade-groups/${encodeURIComponent(codigo)}`, values)
}

interface UseUpdateGradeGroupOptions {
  mutationConfig?: MutationConfig<typeof updateGradeGroup>
}

export function useUpdateGradeGroup({ mutationConfig }: UseUpdateGradeGroupOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateGradeGroup,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["grade-groups"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

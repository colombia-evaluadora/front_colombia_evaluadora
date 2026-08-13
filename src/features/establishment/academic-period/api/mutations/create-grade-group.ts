import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  CreateGradeGroupRequest,
  GradeGroup,
} from "@/features/establishment/academic-period/api/types/grade-group"

function createGradeGroup(input: CreateGradeGroupRequest): Promise<GradeGroup> {
  return api.post("/grade-groups", input)
}

interface UseCreateGradeGroupOptions {
  mutationConfig?: MutationConfig<typeof createGradeGroup>
}

export function useCreateGradeGroup({
  mutationConfig,
}: UseCreateGradeGroupOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createGradeGroup,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["grade-groups"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

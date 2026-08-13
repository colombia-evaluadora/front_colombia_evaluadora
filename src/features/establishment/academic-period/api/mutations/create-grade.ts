import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  CreateGradeRequest,
  Grade,
} from "@/features/establishment/academic-period/types/grade"

function createGrade(input: CreateGradeRequest): Promise<Grade> {
  return api.post("/grades", input)
}

interface UseCreateGradeOptions {
  mutationConfig?: MutationConfig<typeof createGrade>
}

export function useCreateGrade({ mutationConfig }: UseCreateGradeOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createGrade,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["grades"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

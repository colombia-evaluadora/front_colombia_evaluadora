import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  MutationResult,
  UpdateGradeRequest,
} from "../../types/grade"

interface UpdateGradeInput {
  id: number
  values: UpdateGradeRequest
}

function updateGrade({ id, values }: UpdateGradeInput): Promise<MutationResult> {
  return api.patch(`/grades/${id}`, values)
}

interface UseUpdateGradeOptions {
  mutationConfig?: MutationConfig<typeof updateGrade>
}

export function useUpdateGrade({ mutationConfig }: UseUpdateGradeOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateGrade,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["grades"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

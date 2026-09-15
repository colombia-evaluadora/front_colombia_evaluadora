import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { createSubjectLabelOption } from "@/features/academic-management/curricular-references/api/mutations/create-subject-label"
import { subjectLabelOptionsQueryKey } from "@/features/academic-management/curricular-references/api/query/use-subject-label-options"

interface UseCreateSubjectLabelOptions {
  mutationConfig?: MutationConfig<typeof createSubjectLabelOption>
}

export function useCreateSubjectLabelOption({ mutationConfig }: UseCreateSubjectLabelOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSubjectLabelOption,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: subjectLabelOptionsQueryKey() })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

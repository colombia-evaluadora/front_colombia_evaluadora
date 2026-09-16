import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { deleteSubjectLabelOption } from "@/features/academic-management/curricular-references/api/mutations/delete-subject-label"
import { subjectLabelOptionsQueryKey } from "@/features/academic-management/curricular-references/api/query/use-subject-label-options"

interface UseDeleteSubjectLabelOptions {
  mutationConfig?: MutationConfig<typeof deleteSubjectLabelOption>
}

export function useDeleteSubjectLabelOption({ mutationConfig }: UseDeleteSubjectLabelOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteSubjectLabelOption,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: subjectLabelOptionsQueryKey() })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

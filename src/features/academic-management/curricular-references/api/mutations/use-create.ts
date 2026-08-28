import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { create } from "@/features/academic-management/curricular-references/api/mutations/create"

interface UseCreateOptions {
  mutationConfig?: MutationConfig<typeof create>
}

export function useCreate({ mutationConfig }: UseCreateOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: create,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["curricular-references"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

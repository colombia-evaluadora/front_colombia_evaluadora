import { useMutation, useQueryClient } from "@tanstack/react-query"

import { invalidateCampuses } from "@/features/establishment/campuses/api/mutations/invalidate-campuses"
import type { MutationConfig } from "@/lib/react-query"

import { create } from "@/features/establishment/campuses/api/mutations/create"

interface UseCreateOptions {
  mutationConfig?: MutationConfig<typeof create>
}

export function useCreate({ mutationConfig }: UseCreateOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: create,
    ...mutationConfig,
    onSuccess: (...args) => {
      invalidateCampuses(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { invalidateCampuses } from "@/features/establishment/campuses/api/mutations/invalidate-campuses"
import type { MutationConfig } from "@/lib/react-query"

import { createCampus } from "@/features/establishment/campuses/api/mutations/create"

interface UseCreateOptions {
  mutationConfig?: MutationConfig<typeof createCampus>
}

export function useCreate({ mutationConfig }: UseCreateOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}

  return useMutation({
    mutationFn: createCampus,
    ...rest,
    onSuccess: (...args) => {
      invalidateCampuses(queryClient)
      onSuccess?.(...args)
    },
  })
}

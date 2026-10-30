import { useMutation, useQueryClient } from "@tanstack/react-query"

import { invalidateCampuses } from "@/features/establishment/campuses/api/mutations/invalidate-campuses"
import type { MutationConfig } from "@/lib/react-query"

import { updateCampus } from "@/features/establishment/campuses/api/mutations/create"

interface UseUpdateOptions {
  mutationConfig?: MutationConfig<typeof updateCampus>
}

export function useUpdate({ mutationConfig }: UseUpdateOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}

  return useMutation({
    mutationFn: updateCampus,
    ...rest,
    onSuccess: (...args) => {
      invalidateCampuses(queryClient)
      onSuccess?.(...args)
    },
  })
}

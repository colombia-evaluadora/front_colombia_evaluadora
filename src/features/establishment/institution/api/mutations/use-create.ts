import { useMutation, useQueryClient } from "@tanstack/react-query"

import { create } from "@/features/establishment/institution/api/mutations/create"
import type { MutationConfig } from "@/lib/react-query"

interface UseCreateOptions {
  mutationConfig?: MutationConfig<typeof create>
}

export function useCreate({ mutationConfig }: UseCreateOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: create,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["establishments"] })
      queryClient.invalidateQueries({ queryKey: ["establishments", "query"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

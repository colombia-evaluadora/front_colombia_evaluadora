import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createEstablishment } from "./create-establishment"
import type { MutationConfig } from "@/lib/react-query"

interface UseCreateEstablishmentOptions {
  mutationConfig?: MutationConfig<typeof createEstablishment>
}

export function useCreateEstablishment({ mutationConfig }: UseCreateEstablishmentOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createEstablishment,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["establishments"] })
      queryClient.invalidateQueries({ queryKey: ["establishments", "query"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

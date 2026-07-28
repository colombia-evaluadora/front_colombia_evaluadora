import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { createCampus } from "./create-campus"

interface UseCreateCampusOptions {
  mutationConfig?: MutationConfig<typeof createCampus>
}

export function useCreateCampus({ mutationConfig }: UseCreateCampusOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCampus,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["campuses"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
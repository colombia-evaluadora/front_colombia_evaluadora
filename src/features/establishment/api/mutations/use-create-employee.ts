import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { createEmployee } from "./create-employee"

interface UseCreateEmployeeOptions {
  mutationConfig?: MutationConfig<typeof createEmployee>
}

export function useCreateEmployee({ mutationConfig }: UseCreateEmployeeOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createEmployee,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

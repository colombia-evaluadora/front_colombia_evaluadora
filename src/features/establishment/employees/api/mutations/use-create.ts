import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { create } from "@/features/establishment/employees/api/mutations/create"
import { employeeKeys } from "@/features/establishment/employees/api/query-keys"

interface UseCreateOptions {
  mutationConfig?: MutationConfig<typeof create>
}

export function useCreate({ mutationConfig }: UseCreateOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: create,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

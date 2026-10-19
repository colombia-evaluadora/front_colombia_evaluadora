import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { createWithPerson } from "@/features/establishment/employees/api/mutations/create-with-person"
import { employeeKeys } from "@/features/establishment/employees/api/query-keys"

interface UseCreateWithPersonOptions {
  mutationConfig?: MutationConfig<typeof createWithPerson>
}

export function useCreateWithPerson({ mutationConfig }: UseCreateWithPersonOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: createWithPerson,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all })
      onSuccess?.(...args)
    },
  })
}

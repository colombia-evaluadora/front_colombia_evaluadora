import { useMutation } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { createEmployeePerson } from "./create-employee"

interface UseCreateEmployeePersonOptions {
  mutationConfig?: MutationConfig<typeof createEmployeePerson>
}

export function useCreateEmployeePerson({ mutationConfig }: UseCreateEmployeePersonOptions = {}) {
  return useMutation({
    mutationFn: createEmployeePerson,
    ...mutationConfig,
  })
}

import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { update } from "@/features/establishment/employees/api/mutations/update"
import type { Employee } from "@/features/establishment/employees/api/types/employee"

interface UpdateEmployeeInput {
  employeeId: string
  values: Employee
}

function updateMutation({ employeeId, values }: UpdateEmployeeInput) {
  return update(employeeId, values)
}

interface UseUpdateOptions {
  mutationConfig?: MutationConfig<typeof updateMutation>
}

export function useUpdate({ mutationConfig }: UseUpdateOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateMutation,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

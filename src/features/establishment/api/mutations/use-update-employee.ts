import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { MutationConfig } from "@/lib/react-query"

import { updateEmployee } from "./create-employee"
import type { Employee } from "../types/employee"

interface UpdateEmployeeInput {
  employeeId: string
  values: Employee
}

function updateEmployeeMutation({ employeeId, values }: UpdateEmployeeInput) {
  return updateEmployee(employeeId, values)
}

interface UseUpdateEmployeeOptions {
  mutationConfig?: MutationConfig<typeof updateEmployeeMutation>
}

export function useUpdateEmployee({ mutationConfig }: UseUpdateEmployeeOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateEmployeeMutation,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

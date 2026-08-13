import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type { Employee } from "@/features/establishment/employees/api/types/employee"

interface EmployeeQueryResult {
  status: "ok"
  employee: Employee
}

function fetchEmployee(id: string): Promise<EmployeeQueryResult> {
  return api.get(`/establishments/employees/${id}`)
}

export function useEmployeeQuery(id: string | null, enabled = true) {
  return useQuery({
    queryKey: ["employees", id],
    queryFn: () => fetchEmployee(id as string),
    enabled: enabled && Boolean(id),
  })
}

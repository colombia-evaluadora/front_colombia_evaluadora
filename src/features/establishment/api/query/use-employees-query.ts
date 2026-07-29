import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type {
  EmployeesQueryRequest,
  EmployeesQueryResponse,
} from "../types/employee"

interface UseEmployeesQueryParams {
  filters: EmployeesQueryRequest["filters"]
  sorting: EmployeesQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

function fetchEmployees(body: EmployeesQueryRequest): Promise<EmployeesQueryResponse> {
  return api.query("/establishments/employees/query", body)
}

export const employeesQueryKey = (params: UseEmployeesQueryParams) => [
  "employees",
  params,
]

export function useEmployeesQuery(params: UseEmployeesQueryParams) {
  return useQuery({
    queryKey: employeesQueryKey(params),
    queryFn: () => fetchEmployees(params),
    placeholderData: (previous) => previous,
  })
}
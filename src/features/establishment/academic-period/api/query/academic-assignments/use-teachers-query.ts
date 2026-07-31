import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  TeachersQueryRequest,
  TeachersQueryResponse,
} from "../../types/teacher"

interface UseTeachersQueryParams {
  filters: TeachersQueryRequest["filters"]
  sorting: TeachersQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
  academicPeriodId?: number
}

function fetchTeachers(
  body: TeachersQueryRequest
): Promise<TeachersQueryResponse> {
  return api.query("/teachers/query", body)
}

export const teachersQueryKey = (params: UseTeachersQueryParams) => [
  "teachers",
  params,
]

export function useTeachersQuery(params: UseTeachersQueryParams) {
  return useQuery({
    queryKey: teachersQueryKey(params),
    queryFn: () => fetchTeachers(params),
    placeholderData: (previous) => previous,
  })
}

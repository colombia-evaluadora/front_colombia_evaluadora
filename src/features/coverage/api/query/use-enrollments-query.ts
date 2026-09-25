import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  EnrollmentsQueryFilters,
  EnrollmentsQueryRequest,
  EnrollmentsQueryResponse,
} from "@/features/coverage/api/types/enrollment"

interface UseEnrollmentsQueryParams {
  filters: EnrollmentsQueryFilters
  sorting: EnrollmentsQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

function fetchEnrollments(body: EnrollmentsQueryRequest): Promise<EnrollmentsQueryResponse> {
  return api.query("/coverage/enrollments/query", body)
}

export const enrollmentsQueryKey = (params: UseEnrollmentsQueryParams) => [
  "enrollments",
  params,
]

export function useEnrollmentsQuery(params: UseEnrollmentsQueryParams) {
  return useQuery({
    queryKey: enrollmentsQueryKey(params),
    queryFn: () => fetchEnrollments(params),
    placeholderData: (previous) => previous,
  })
}

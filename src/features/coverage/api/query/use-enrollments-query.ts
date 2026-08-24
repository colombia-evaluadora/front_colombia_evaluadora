import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  EnrollmentsQueryRequest,
  EnrollmentsQueryResponse,
} from "@/features/coverage/api/types/enrollment"
import type { ReservationsQueryFilters } from "@/features/coverage/api/types/reservation"

interface UseEnrollmentsQueryParams {
  filters: ReservationsQueryFilters
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

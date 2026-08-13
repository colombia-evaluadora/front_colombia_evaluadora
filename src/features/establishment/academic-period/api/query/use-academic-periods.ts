import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  AcademicPeriodsQueryRequest,
  AcademicPeriodsQueryResponse,
} from "@/features/establishment/academic-period/types/academic-period"

interface UseAcademicPeriodsQueryParams {
  filters: AcademicPeriodsQueryRequest["filters"]
  sorting: AcademicPeriodsQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

function fetchAcademicPeriods(
  body: AcademicPeriodsQueryRequest
): Promise<AcademicPeriodsQueryResponse> {
  return api.query("/academic-periods/query", body)
}

export const academicPeriodsQueryKey = (
  params: UseAcademicPeriodsQueryParams
) => ["academic-periods", params]

export function useAcademicPeriodsQuery(params: UseAcademicPeriodsQueryParams) {
  return useQuery({
    queryKey: academicPeriodsQueryKey(params),
    queryFn: () => fetchAcademicPeriods(params),
    placeholderData: (previous) => previous,
  })
}

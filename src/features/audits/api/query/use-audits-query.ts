import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { AuditsQueryRequest, AuditsQueryResponse } from "../types/audit"

interface UseAuditsQueryParams {
  filters: AuditsQueryRequest["filters"]
  sorting: AuditsQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

function fetchAudits(body: AuditsQueryRequest): Promise<AuditsQueryResponse> {
  return api.query("/audits/query", body)
}

export const auditsQueryKey = (params: UseAuditsQueryParams) => ["audits", params]

export function useAuditsQuery(params: UseAuditsQueryParams) {
  return useQuery({
    queryKey: auditsQueryKey(params),
    queryFn: () => fetchAudits(params),
    placeholderData: (previous) => previous,
  })
}

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  AreaSubjectsQueryRequest,
  AreaSubjectsQueryResponse
} from "../types/academic-period/area-subject"

interface UseAreaSubjectQueryParams {
  filters: AreaSubjectsQueryRequest["filters"]
  sorting: AreaSubjectsQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

function fetchAreaSubject(
  body: AreaSubjectsQueryRequest
): Promise<AreaSubjectsQueryResponse> {
  return api.query("/area-subjects/query", body)
}

export const areaSubjectQueryKey = (
  params: UseAreaSubjectQueryParams
) => ["area-subjects", params]

export function useAreaSubjectQuery(
  params: UseAreaSubjectQueryParams
) {
  return useQuery({
    queryKey: areaSubjectQueryKey(params),
    queryFn: () => fetchAreaSubject(params),
    placeholderData: (previous) => previous,
  })
}

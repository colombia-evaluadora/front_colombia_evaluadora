import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  GradeGroupsQueryRequest,
  GradeGroupsQueryResponse,
} from "../types/academic-period/grade-group"

interface UseGradeGroupsQueryParams {
  filters: GradeGroupsQueryRequest["filters"]
  sorting: GradeGroupsQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

function fetchGradeGroups(
  body: GradeGroupsQueryRequest
): Promise<GradeGroupsQueryResponse> {
  return api.query("/grade-groups/query", body)
}

export const gradeGroupsQueryKey = (params: UseGradeGroupsQueryParams) => [
  "grade-groups",
  params,
]

export function useGradeGroupsQuery(params: UseGradeGroupsQueryParams) {
  return useQuery({
    queryKey: gradeGroupsQueryKey(params),
    queryFn: () => fetchGradeGroups(params),
    placeholderData: (previous) => previous,
  })
}

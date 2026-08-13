import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  StudyPlanQueryRequest,
  StudyPlanQueryResponse,
} from "@/features/establishment/academic-period/api/types/study-plan"

interface UseStudyPlansQueryParams {
  filters: StudyPlanQueryRequest["filters"]
  sorting: StudyPlanQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
  academicPeriodId?: number
  gradeId?: number
}

function fetchStudyPlans(
  body: StudyPlanQueryRequest
): Promise<StudyPlanQueryResponse> {
  return api.query("/study-plans/query", body)
}

export const studyPlansQueryKey = (params: UseStudyPlansQueryParams) => [
  "study-plans",
  params,
]

export function useStudyPlansQuery(params: UseStudyPlansQueryParams) {
  return useQuery({
    queryKey: studyPlansQueryKey(params),
    queryFn: () => fetchStudyPlans(params),
    placeholderData: (previous) => previous,
  })
}

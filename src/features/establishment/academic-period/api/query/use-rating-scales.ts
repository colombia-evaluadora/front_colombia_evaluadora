import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  RatingScalesQueryRequest,
  RatingScalesQueryResponse,
} from "@/features/establishment/academic-period/api/types/rating-scales"

interface UseRatingScalesQueryParams {
  filters: RatingScalesQueryRequest["filters"]
  sorting: RatingScalesQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
  academicPeriodId?: number
}

function fetchRatingScales(
  body: RatingScalesQueryRequest
): Promise<RatingScalesQueryResponse> {
  return api.query("/rating-scales/query", body)
}

export const ratingScalesQueryKey = (params: UseRatingScalesQueryParams) => [
  "rating-scales",
  params,
]

export function useRatingScalesQuery(params: UseRatingScalesQueryParams) {
  return useQuery({
    queryKey: ratingScalesQueryKey(params),
    queryFn: () => fetchRatingScales(params),
    placeholderData: (previous) => previous,
  })
}

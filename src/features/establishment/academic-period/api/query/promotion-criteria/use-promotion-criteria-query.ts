import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { PromotionCriteria } from "../../types/promotion-criteria"

function fetchPromotionCriteria(
  academicPeriodId: number
): Promise<PromotionCriteria> {
  return api.get(`/promotion-criteria/${academicPeriodId}`)
}

export const promotionCriteriaQueryKey = (academicPeriodId: number) => [
  "promotion-criteria",
  academicPeriodId,
]

export function usePromotionCriteriaQuery(academicPeriodId: number | undefined) {
  return useQuery({
    queryKey: promotionCriteriaQueryKey(academicPeriodId ?? 0),
    queryFn: () => fetchPromotionCriteria(academicPeriodId as number),
    enabled: academicPeriodId != null,
  })
}

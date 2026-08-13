import { http, HttpResponse, delay } from "msw"

import {
  DEFAULT_PROMOTION_CRITERIA,
  promotionCriteriaDb,
} from "@/mocks/db/academic-period/promotion-criteria"
import type {
  MutationResult,
  PromotionCriteria,
} from "@/features/establishment/academic-period/api/types/promotion-criteria"

export const promotionCriteriaHandlers = [
  http.get("/api/promotion-criteria/:academicPeriodId", async ({ params }) => {
    await delay(200)
    const id = Number(params.academicPeriodId)
    const criteria = promotionCriteriaDb[id] ?? DEFAULT_PROMOTION_CRITERIA
    return HttpResponse.json<PromotionCriteria>(criteria)
  }),

  http.patch(
    "/api/promotion-criteria/:academicPeriodId",
    async ({ params, request }) => {
      await delay(400)
      const id = Number(params.academicPeriodId)
      const body = (await request.json()) as PromotionCriteria
      promotionCriteriaDb[id] = body
      return HttpResponse.json<MutationResult>({
        status: "ok",
        message: "Criterios de promoción guardados.",
      })
    }
  ),
]

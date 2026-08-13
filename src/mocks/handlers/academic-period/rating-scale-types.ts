import { http, HttpResponse, delay } from "msw"

import { ratingScaleTypesDb } from "@/mocks/db/academic-period/rating-scale-types"
import type { RatingScaleTypeOption } from "@/features/establishment/academic-period/api/types/rating-scales"

export const ratingScaleTypesHandlers = [
  http.get("/api/rating-scale-types", async () => {
    await delay(150)
    return HttpResponse.json<RatingScaleTypeOption[]>(ratingScaleTypesDb)
  }),
]

import { http, HttpResponse, delay } from "msw"

import { ratingScaleTypesDb } from "../db/rating-scale-types"
import type { RatingScaleType } from "@/features/establishment/api/types/academic-period/rating-scales"

export const ratingScaleTypesHandlers = [
  http.get("/api/rating-scale-types", async () => {
    await delay(150)
    return HttpResponse.json<RatingScaleType[]>(ratingScaleTypesDb)
  }),
]

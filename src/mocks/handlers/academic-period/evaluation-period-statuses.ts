import { http, HttpResponse, delay } from "msw"

import { evaluationPeriodStatusesDb } from "../../db/academic-period/evaluation-period-statuses"
import type { EvaluationPeriodStatusOption } from "@/features/establishment/academic-period/api/types/evaluation-period"

export const evaluationPeriodStatusesHandlers = [
  http.get("/api/evaluation-period-statuses", async () => {
    await delay(150)
    return HttpResponse.json<EvaluationPeriodStatusOption[]>(
      evaluationPeriodStatusesDb
    )
  }),
]
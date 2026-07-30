import { http, HttpResponse, delay } from "msw"

import { evaluationPeriodStatusesDb } from "../db/evaluation-period-statuses"
import type { EvaluationPeriodStatus } from "@/features/establishment/api/types/academic-period/evaluation-period"

export const evaluationPeriodStatusesHandlers = [
  http.get("/api/evaluation-period-statuses", async () => {
    await delay(150)
    return HttpResponse.json<EvaluationPeriodStatus[]>(
      evaluationPeriodStatusesDb
    )
  }),
]
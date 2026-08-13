import { http, HttpResponse, delay } from "msw"

import { academicPeriodStatusesDb } from "@/mocks/db/academic-period/academic-period-statuses"
import type { AcademicPeriodStatusOption } from "@/features/establishment/academic-period/api/types/academic-period"

export const academicPeriodStatusesHandlers = [
  http.get("/api/academic-period-statuses", async () => {
    await delay(150)
    return HttpResponse.json<AcademicPeriodStatusOption[]>(
      academicPeriodStatusesDb
    )
  }),
]

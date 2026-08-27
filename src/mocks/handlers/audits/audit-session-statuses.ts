import { http, HttpResponse, delay } from "msw"

import { auditSessionStatusesDb } from "@/mocks/db/audits/audit-session-statuses"
import type { SessionStatusOption } from "@/features/administration/audits/api/types/audit"

export const auditSessionStatusesHandlers = [
  http.get("/api/audit-session-statuses", async () => {
    await delay(150)
    return HttpResponse.json<SessionStatusOption[]>(auditSessionStatusesDb)
  }),
]
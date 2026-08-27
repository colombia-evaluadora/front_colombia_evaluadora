import { http, HttpResponse, delay } from "msw"

import { auditOperationTypesDb } from "@/mocks/db/audits/audit-operation-types"
import type { OperationTypeOption } from "@/features/administration/audits/api/types/audit-table"

export const auditOperationTypesHandlers = [
  http.get("/api/audit-operation-types", async () => {
    await delay(150)
    return HttpResponse.json<OperationTypeOption[]>(auditOperationTypesDb)
  }),
]
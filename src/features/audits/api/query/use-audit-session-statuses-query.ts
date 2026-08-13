import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { SessionStatusOption } from "@/features/audits/api/types/audit"

function fetchAuditSessionStatuses(): Promise<SessionStatusOption[]> {
  return api.get("/audit-session-statuses")
}

export const auditSessionStatusesQueryKey = () => ["audit-session-statuses"]

export function useAuditSessionStatusesQuery() {
  return useQuery({
    queryKey: auditSessionStatusesQueryKey(),
    queryFn: fetchAuditSessionStatuses,
    staleTime: Infinity,
  })
}
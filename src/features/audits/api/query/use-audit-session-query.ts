import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { AuditSession } from "@/features/audits/api/types/audit"

interface UseAuditSessionQueryParams {
  sessionId: string
  enabled?: boolean
}

function fetchAuditSession(sessionId: string): Promise<AuditSession> {
  return api.get(`/audits/sessions/${sessionId}`)
}

export function useAuditSessionQuery({ sessionId, enabled }: UseAuditSessionQueryParams) {
  return useQuery({
    queryKey: ["audits", "sessions", sessionId],
    queryFn: () => fetchAuditSession(sessionId),
    enabled: enabled ?? true,
  })
}

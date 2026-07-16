import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { AuditsStats, AuditsStatsRequest } from "../types/audit"

function fetchAuditsStats(body: AuditsStatsRequest): Promise<AuditsStats> {
  return api.query("/audits/stats", body)
}

export function useAuditsStatsQuery(params: AuditsStatsRequest) {
  return useQuery({
    queryKey: ["audits", "stats", params],
    queryFn: () => fetchAuditsStats(params),
    placeholderData: (previous) => previous,
  })
}

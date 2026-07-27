import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { AuditTable } from "../types/audit-table"

interface UseAuditTableQueryParams {
  tableSlug: string
  enabled?: boolean
}

function fetchAuditTable(tableSlug: string): Promise<AuditTable> {
  return api.get(`/audit-tables/${tableSlug}`)
}

export function useAuditTableQuery({ tableSlug, enabled }: UseAuditTableQueryParams) {
  return useQuery({
    queryKey: ["audit-tables", tableSlug],
    queryFn: () => fetchAuditTable(tableSlug),
    enabled: enabled ?? true,
  })
}

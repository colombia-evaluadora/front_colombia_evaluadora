import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { AuditTable } from "../types/audit-table"

function fetchAuditTables(): Promise<AuditTable[]> {
  return api.get("/audit-tables")
}

export function useAuditTablesQuery() {
  return useQuery({
    queryKey: ["audit-tables"],
    queryFn: fetchAuditTables,
  })
}

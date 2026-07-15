import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  AuditTablesQueryRequest,
  AuditTablesQueryResponse,
} from "../types/audit-table"

interface UseAuditTablesQueryParams {
  filters: AuditTablesQueryRequest["filters"]
  sorting: AuditTablesQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

function fetchAuditTables(
  body: AuditTablesQueryRequest
): Promise<AuditTablesQueryResponse> {
  return api.post("/audit-tables/query", body)
}

export const auditTablesQueryKey = (params: UseAuditTablesQueryParams) => [
  "audit-tables",
  params,
]

export function useAuditTablesQuery(params: UseAuditTablesQueryParams) {
  return useQuery({
    queryKey: auditTablesQueryKey(params),
    queryFn: () => fetchAuditTables(params),
    placeholderData: (previous) => previous,
  })
}
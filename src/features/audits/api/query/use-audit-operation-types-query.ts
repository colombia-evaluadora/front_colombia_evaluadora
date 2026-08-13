import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { OperationTypeOption } from "@/features/audits/api/types/audit-table"

function fetchAuditOperationTypes(): Promise<OperationTypeOption[]> {
  return api.get("/audit-operation-types")
}

export const auditOperationTypesQueryKey = () => ["audit-operation-types"]

export function useAuditOperationTypesQuery() {
  return useQuery({
    queryKey: auditOperationTypesQueryKey(),
    queryFn: fetchAuditOperationTypes,
    staleTime: Infinity,
  })
}
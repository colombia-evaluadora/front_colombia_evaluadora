import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { OperationChangesResponse } from "../types/audit-table"

interface UseOperationChangesQueryParams {
  tableSlug: string
  operationId: string
  showAll?: boolean
  enabled?: boolean
}

function fetchOperationChanges({
  tableSlug,
  operationId,
  showAll,
}: UseOperationChangesQueryParams): Promise<OperationChangesResponse> {
  // GET: estamos leyendo un recurso específico (los cambios de una
  // operación), no ejecutando una acción.
  return api.get(
    `/audit-tables/${tableSlug}/operations/${operationId}/changes`,
    { params: { showAll: showAll ?? false } }
  )
}

export function useOperationChangesQuery(
  params: UseOperationChangesQueryParams
) {
  return useQuery({
    queryKey: [
      "audit-tables",
      params.tableSlug,
      "operations",
      params.operationId,
      "changes",
      { showAll: params.showAll ?? false },
    ],
    queryFn: () => fetchOperationChanges(params),
    enabled: params.enabled ?? true,
  })
}
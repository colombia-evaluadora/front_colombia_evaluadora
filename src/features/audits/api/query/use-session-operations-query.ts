import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { SessionOperationsQueryRequest, SessionOperationsResponse } from "../types/audit"

interface UseSessionOperationsQueryParams {
  sessionId: string
  filters: SessionOperationsQueryRequest["filters"]
  sorting: SessionOperationsQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

function fetchSessionOperations(
  params: UseSessionOperationsQueryParams
): Promise<SessionOperationsResponse> {
  // El body lleva los filtros/sort/page, igual que el endpoint paginado
  // de operaciones por tabla.
  return api.query(
    `/audits/sessions/${params.sessionId}/operations`,
    params
  )
}

export function useSessionOperationsQuery(
  params: UseSessionOperationsQueryParams
) {
  return useQuery({
    queryKey: [
      "audits",
      "sessions",
      params.sessionId,
      "operations",
      params,
    ],
    queryFn: () => fetchSessionOperations(params),
    placeholderData: (previous) => previous,
  })
}
import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  TableOperationsQueryRequest,
  TableOperationsQueryResponse,
} from "@/features/audits/api/types/audit-table"

interface UseTableOperationsQueryParams {
  tableSlug: string
  filters: TableOperationsQueryRequest["filters"]
  sorting: TableOperationsQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

function fetchTableOperations(
  params: UseTableOperationsQueryParams,
): Promise<TableOperationsQueryResponse> {
  const { tableSlug, ...body } = params
  return api.query(`/audit-tables/${tableSlug}/operations/query`, body)
}

export function useTableOperationsQuery(params: UseTableOperationsQueryParams) {
  return useQuery({
    queryKey: ["audit-tables", params.tableSlug, "operations", params],
    queryFn: () => fetchTableOperations(params),
    placeholderData: (previous) => previous,
  })
}

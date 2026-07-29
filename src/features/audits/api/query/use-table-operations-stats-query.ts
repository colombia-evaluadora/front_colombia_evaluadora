import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { TableOperationsStats, TableOperationsStatsRequest } from "../types/audit-table"

interface UseTableOperationsStatsQueryParams extends TableOperationsStatsRequest {
  tableSlug: string
}

function fetchTableOperationsStats({
  tableSlug,
  ...body
}: UseTableOperationsStatsQueryParams): Promise<TableOperationsStats> {
  return api.query(`/audit-tables/${tableSlug}/operations/stats`, body)
}

export function useTableOperationsStatsQuery(params: UseTableOperationsStatsQueryParams) {
  return useQuery({
    queryKey: ["audit-tables", params.tableSlug, "operations", "stats", params],
    queryFn: () => fetchTableOperationsStats(params),
    placeholderData: (previous) => previous,
  })
}

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type { CurricularStatement } from "@/features/academic-management/curricular-references/api/types/statement"

interface StatementsResponse {
  rows: CurricularStatement[]
}

async function fetchStatements(curricularReferenceId: number, areaId: number): Promise<CurricularStatement[]> {
  const response = await api.get<StatementsResponse>(
    `/academic-management/curricular-references/${curricularReferenceId}/statements`,
    { params: { areaId } },
  )
  return response.rows
}

export const curricularStatementsQueryKey = (curricularReferenceId: number, areaId: number) => [
  "curricular-statements",
  curricularReferenceId,
  areaId,
]

export function useCurricularStatementsQuery(curricularReferenceId: number, areaId: number | null) {
  return useQuery({
    queryKey: curricularStatementsQueryKey(curricularReferenceId, areaId ?? -1),
    queryFn: () => fetchStatements(curricularReferenceId, areaId as number),
    enabled: areaId != null,
  })
}

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type { CurricularEvidence } from "@/features/academic-management/curricular-references/api/types/statement"

interface EvidencesResponse {
  rows: CurricularEvidence[]
}

async function fetchEvidences(statementId: number): Promise<CurricularEvidence[]> {
  const response = await api.get<EvidencesResponse>(
    `/academic-management/curricular-statements/${statementId}/evidences`,
  )
  return response.rows
}

export const curricularEvidencesQueryKey = (statementId: number) => ["curricular-evidences", statementId]

export function useCurricularEvidencesQuery(statementId: number | null) {
  return useQuery({
    queryKey: curricularEvidencesQueryKey(statementId ?? -1),
    queryFn: () => fetchEvidences(statementId as number),
    enabled: statementId != null,
  })
}

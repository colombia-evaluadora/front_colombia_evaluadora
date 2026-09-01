import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { env } from "@/config/env"
import { unwrapRows } from "@/lib/response-envelope"

import type { CurricularEvidence } from "@/features/academic-management/curricular-references/api/types/statement"

interface EvidencesResponse {
  rows: CurricularEvidence[]
}

interface EvidenceRow {
  pk_referente_enunciado: number
  texto: string
  estado: "A" | "I"
  active: boolean
}

function toEvidence(row: EvidenceRow, statementId: number): CurricularEvidence {
  return {
    id: row.pk_referente_enunciado,
    statementId,
    text: row.texto,
    active: row.estado === "A",
  }
}

async function fetchEvidences(statementId: number): Promise<CurricularEvidence[]> {
  const url = apiPath(
    `/academic-management/curricular-statements/${statementId}/evidences`,
    `/referentes-curriculares/enunciados/${statementId}/evidencias`,
  )

  if (env.ENABLE_API_MOCKING) {
    const response = await api.get<EvidencesResponse>(url)
    return response.rows
  }

  const raw = await api.get<EvidenceRow[] | { rows: EvidenceRow[] }>(url)
  return unwrapRows(raw).map((row) => toEvidence(row, statementId))
}

export const curricularEvidencesQueryKey = (statementId: number) => ["curricular-evidences", statementId]

export function useCurricularEvidencesQuery(statementId: number | null) {
  return useQuery({
    queryKey: curricularEvidencesQueryKey(statementId ?? -1),
    queryFn: () => fetchEvidences(statementId as number),
    enabled: statementId != null,
  })
}

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { env } from "@/config/env"
import { unwrapRows } from "@/lib/response-envelope"

import type { CurricularStatement } from "@/features/academic-management/curricular-references/api/types/statement"

interface StatementsResponse {
  rows: CurricularStatement[]
}

interface StatementRow {
  pk_referente_enunciado: number
  texto: string
  estado: "A" | "I"
  active: boolean
  fk_referente_curricular_area: number | null
  total_evidencias: number
}

function toStatement(row: StatementRow, curricularReferenceId: number, areaId: number): CurricularStatement {
  return {
    id: row.pk_referente_enunciado,
    curricularReferenceId,
    areaId: row.fk_referente_curricular_area ?? areaId,
    text: row.texto,
    active: row.active,
  }
}

async function fetchStatements(curricularReferenceId: number, areaId: number): Promise<CurricularStatement[]> {
  const url = apiPath(
    `/academic-management/curricular-references/${curricularReferenceId}/statements`,
    `/referentes-curriculares/${curricularReferenceId}/enunciados`,
  )

  if (env.ENABLE_API_MOCKING) {
    const response = await api.get<StatementsResponse>(url, { params: { areaId } })
    return response.rows
  }

  const raw = await api.get<StatementRow[] | { rows: StatementRow[] }>(url, { params: { area: areaId } })
  return unwrapRows(raw).map((row) => toStatement(row, curricularReferenceId, areaId))
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

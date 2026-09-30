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
  fk_tlv_grado: number | null
  total_evidencias: number
}

function toStatement(row: StatementRow, curricularReferenceId: number): CurricularStatement {
  return {
    id: row.pk_referente_enunciado,
    curricularReferenceId,
    areaId: row.fk_referente_curricular_area,
    gradeId: row.fk_tlv_grado ?? null,
    text: row.texto,
    active: row.estado === "A",
  }
}

export async function fetchStatements(
  curricularReferenceId: number,
  areaId: number | null,
  gradeId: number | null = null,
): Promise<CurricularStatement[]> {
  const url = apiPath(
    `/academic-management/curricular-references/${curricularReferenceId}/statements`,
    `/referentes-curriculares/${curricularReferenceId}/enunciados`,
  )

  if (env.ENABLE_API_MOCKING) {
    const response = await api.get<StatementsResponse>(url, { params: { areaId } })
    return response.rows
  }

  const raw = await api.get<StatementRow[] | { rows: StatementRow[] }>(url, {
    params: {
      ...(areaId != null ? { area: areaId } : {}),
      ...(gradeId != null ? { grado: gradeId } : {}),
    },
  })
  return unwrapRows(raw).map((row) => toStatement(row, curricularReferenceId))
}

export const curricularStatementsQueryKey = (
  curricularReferenceId: number,
  areaId: number | null,
  gradeId: number | null = null,
) => ["curricular-statements", curricularReferenceId, areaId, gradeId]

/** `undefined` en área o grado = filtro visible sin valor: no consulta. */
export function useCurricularStatementsQuery(
  curricularReferenceId: number,
  areaId: number | null | undefined,
  gradeId: number | null | undefined = null,
) {
  return useQuery({
    queryKey: curricularStatementsQueryKey(curricularReferenceId, areaId ?? null, gradeId ?? null),
    queryFn: () => fetchStatements(curricularReferenceId, areaId ?? null, gradeId ?? null),
    enabled: areaId !== undefined && gradeId !== undefined,
  })
}

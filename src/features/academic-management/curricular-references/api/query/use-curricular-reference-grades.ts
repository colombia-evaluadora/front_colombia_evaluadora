import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { env } from "@/config/env"
import { unwrapRows } from "@/lib/response-envelope"

/** Grado que el referente ofrece según sus niveles educativos (Regla 12). */
export interface CurricularReferenceGrade {
  /** `fk_tlv_grado`: se envía como `?grado=` y `GRADO_ID`. */
  id: number
  code: string
  name: string
  educationLevel: string
  totalStatements: number
}

interface ReferenceGradeRow {
  fk_tlv_grado: number
  codigo: string
  nombre: string
  fk_tnivel_ensenanza: number
  nivel_ensenanza: string
  total_enunciados: number
}

export async function fetchCurricularReferenceGrades(
  curricularReferenceId: number,
): Promise<CurricularReferenceGrade[]> {
  // Sin handler MSW: lista vacía = selector Grado oculto.
  if (env.ENABLE_API_MOCKING) return []

  const url = apiPath(
    `/academic-management/curricular-references/${curricularReferenceId}/grades`,
    `/referentes-curriculares/${curricularReferenceId}/grados`,
  )
  const raw = await api.get<ReferenceGradeRow[] | { rows: ReferenceGradeRow[] }>(url)
  return unwrapRows(raw).map((row) => ({
    id: row.fk_tlv_grado,
    code: row.codigo,
    name: row.nombre,
    educationLevel: row.nivel_ensenanza,
    totalStatements: Number(row.total_enunciados ?? 0),
  }))
}

export const curricularReferenceGradesQueryKey = (curricularReferenceId: number) => [
  "curricular-reference-grades",
  curricularReferenceId,
]

export function useCurricularReferenceGradesQuery(curricularReferenceId: number) {
  return useQuery({
    queryKey: curricularReferenceGradesQueryKey(curricularReferenceId),
    queryFn: () => fetchCurricularReferenceGrades(curricularReferenceId),
    enabled: Number.isFinite(curricularReferenceId),
  })
}

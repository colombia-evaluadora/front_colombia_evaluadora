import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { unwrapRows } from "@/lib/response-envelope"

export interface CurricularReferenceArea {
  id: number
  tareaAsignaturaId: number
  name: string
}

interface ReferenceAreaRow {
  pk_referente_curricular_area: number
  fk_tarea_asignatura: number
  nombre: string
}

export async function fetchCurricularReferenceAreas(
  curricularReferenceId: number,
): Promise<CurricularReferenceArea[]> {
  const url = apiPath(
    `/academic-management/curricular-references/${curricularReferenceId}/areas`,
    `/referentes-curriculares/${curricularReferenceId}/areas`,
  )
  const raw = await api.get<ReferenceAreaRow[] | { rows: ReferenceAreaRow[] }>(url)
  return unwrapRows(raw).map((row) => ({
    id: row.pk_referente_curricular_area,
    tareaAsignaturaId: row.fk_tarea_asignatura,
    name: row.nombre,
  }))
}

export const curricularReferenceAreasQueryKey = (curricularReferenceId: number) => [
  "curricular-reference-areas",
  curricularReferenceId,
]

export function useCurricularReferenceAreasQuery(curricularReferenceId: number) {
  return useQuery({
    queryKey: curricularReferenceAreasQueryKey(curricularReferenceId),
    queryFn: () => fetchCurricularReferenceAreas(curricularReferenceId),
    enabled: Number.isFinite(curricularReferenceId),
  })
}

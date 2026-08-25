import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

interface AreaListRow {
  id: number
  nombre_interno: string
}
interface AreasListRawResponse {
  rows: AreaListRow[]
}

export interface AreaOption {
  id: number
  label: string
}

// Áreas de un período (`POST /eval-col/areas/query`, `fn_area_listar`). Se
// usa para el select de "obligatorias" del criterio de promoción cuando el
// nodo curricular es "AR" (área) — para "AS" (asignatura) se sigue usando
// `useSubjectsQuery`. Selección por `id` (el nombre de área sí es único por
// período, pero se mantiene consistente con subjects para compartir el mismo
// campo `requiredSubjects: number[]` del form).
async function fetchPeriodAreas(academicPeriodId: number): Promise<AreaOption[]> {
  const raw: AreasListRawResponse = await api.query("/eval-col/areas/query", {
    FK_PERIODO: academicPeriodId,
    NOMBRE_INTERNO: null,
    // `fn_area_listar` es 0-based (`OFFSET page_index * page_size`); con
    // `PAGE_INDEX: 1` se saltaba las primeras 200 filas y siempre volvía
    // vacío (casi ningún periodo tiene más de 200 áreas).
    PAGE_INDEX: 0,
    PAGE_SIZE: 200,
    SORT_BY: null,
    SORT_DIR: null,
  })
  return (raw.rows ?? []).map((row) => ({ id: row.id, label: row.nombre_interno }))
}

export const periodAreasQueryKey = (academicPeriodId?: number) => [
  "period-areas",
  academicPeriodId,
]

export function usePeriodAreasQuery(academicPeriodId?: number) {
  return useQuery({
    queryKey: periodAreasQueryKey(academicPeriodId),
    queryFn: () => fetchPeriodAreas(academicPeriodId as number),
    enabled: academicPeriodId != null,
  })
}

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { ReportFilterOption } from "@/features/establishment/academic-period/api/query/use-study-plan-report-filters"

interface AreaRow {
  id: number
  nombre_interno: string
}
interface AreasRawResponse {
  rows: AreaRow[]
}

// Mismo endpoint que `use-area-subject.ts` (`fn_area_listar`), pero sin
// paginar y solo para alimentar el multi-select de "Área" del reporte
// combinado de áreas/asignaturas/especialidades.
async function fetchAreaOptions(academicPeriodId?: number): Promise<ReportFilterOption[]> {
  if (academicPeriodId == null) return []
  const raw: AreasRawResponse = await api.query("/eval-col/areas/query", {
    FK_PERIODO: academicPeriodId,
    NOMBRE_INTERNO: null,
    PAGE_INDEX: 0,
    PAGE_SIZE: 200,
    SORT_BY: null,
    SORT_DIR: null,
  })
  return (raw.rows ?? []).map((row) => ({ id: row.id, nombre: row.nombre_interno }))
}

export const areaOptionsQueryKey = (academicPeriodId?: number) => [
  "area-subject-report",
  "area-options",
  academicPeriodId,
]

export function useAreaOptionsQuery(academicPeriodId?: number) {
  return useQuery({
    queryKey: areaOptionsQueryKey(academicPeriodId),
    queryFn: () => fetchAreaOptions(academicPeriodId),
  })
}

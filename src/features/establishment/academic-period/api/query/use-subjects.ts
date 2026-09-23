import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { useGeneralAreasQuery } from "@/features/establishment/academic-period/api/query/use-general-areas"

interface SubjectRow {
  id: number
  nombre_interno: string
  enfasis_nombre: string | null
  asignatura_general_id: number | null
}
interface SubjectsResponse {
  rows: SubjectRow[]
}

export interface SubjectOption {
  id: number
  label: string
}

async function fetchSubjectRows(academicPeriodId?: number): Promise<SubjectRow[]> {
  if (academicPeriodId == null) return []
  const raw: SubjectsResponse = await api.query("/eval-col/areas/asignaturas", {
    FK_PERIODO: academicPeriodId,
    FILTRO: null,
    PAGE_INDEX: 0,
    PAGE_SIZE: 200,
    SORT_BY: null,
    SORT_DIR: null,
  })
  return raw.rows ?? []
}

export const subjectsQueryKey = (academicPeriodId?: number) => ["subjects", academicPeriodId]

export function useSubjectsQuery(academicPeriodId?: number) {
  const { data: rows = [], ...rest } = useQuery({
    queryKey: subjectsQueryKey(academicPeriodId),
    queryFn: () => fetchSubjectRows(academicPeriodId),
  })
  const { data: generalAreas = [] } = useGeneralAreasQuery()
  const generalNameById = new Map(generalAreas.map((area) => [area.id, area.nombre]))
  const preescolarFallbackGeneralId = generalAreas[0]?.id

  const data: SubjectOption[] = rows.map((row) => {
    const esRellenoDePreescolar =
      row.asignatura_general_id != null && row.asignatura_general_id === preescolarFallbackGeneralId
    const nombreBase =
      (row.asignatura_general_id != null && !esRellenoDePreescolar
        ? generalNameById.get(row.asignatura_general_id)
        : undefined) ?? row.nombre_interno
    return {
      id: row.id,
      label: row.enfasis_nombre ? `${nombreBase} (${row.enfasis_nombre})` : nombreBase,
    }
  })

  return { ...rest, data }
}

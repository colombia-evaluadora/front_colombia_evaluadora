import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  Grade,
  GradesQueryRequest,
  GradesQueryResponse,
} from "@/features/establishment/academic-period/api/types/grade"

interface UseGradesQueryParams {
  filters: GradesQueryRequest["filters"]
  sorting: GradesQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
  academicPeriodId?: number
}

// Fila cruda de `GET /eval-col/grados` (`fn_grado_listar`, id_query 60).
interface GradeRow {
  id: number
  nombre: string
  grado: string
  teaching_level_id: number
  teaching_level_name: string
  grado_siguiente: string | null
  grado_siguiente_name: string | null
  tiene_grado_siguiente: boolean
  total_count: number
}
interface GradesRawResponse {
  rows: GradeRow[]
}

function toGrade(row: GradeRow): Grade {
  return {
    id: row.id,
    nombre: row.nombre,
    grado: row.grado,
    teachingLevelId: row.teaching_level_id,
    teachingLevelName: row.teaching_level_name,
    gradoSiguiente: row.grado_siguiente ?? undefined,
    gradoSiguienteName: row.grado_siguiente_name ?? undefined,
    tieneGradoSiguiente: row.tiene_grado_siguiente,
  }
}

async function fetchGrades(
  params: UseGradesQueryParams
): Promise<GradesQueryResponse> {
  if (params.academicPeriodId == null) {
    return { rows: [], pageCount: 1, totalCount: 0 }
  }
  const [primary] = params.sorting
  const query = new URLSearchParams({
    fkPeriodo: String(params.academicPeriodId),
    pageIndex: String(params.pageIndex),
    pageSize: String(params.pageSize),
  })
  if (params.filters.nombre) query.set("filtro", params.filters.nombre)
  if (primary) {
    query.set("sortingId", primary.id)
    query.set("sortingDesc", String(primary.desc))
  }

  const raw: GradesRawResponse = await api.get(`/eval-col/grados?${query.toString()}`)
  let rows = (raw.rows ?? []).map(toGrade)
  // `fn_grado_listar` no filtra por nivel de enseñanza; se filtra en cliente.
  if (params.filters.teachingLevelIds?.length) {
    rows = rows.filter((row) =>
      params.filters.teachingLevelIds?.includes(row.teachingLevelId)
    )
  }
  const totalCount = raw.rows?.[0]?.total_count ?? 0
  const pageCount = Math.max(1, Math.ceil(totalCount / params.pageSize))
  return { rows, pageCount, totalCount }
}

export const gradesQueryKey = (params: UseGradesQueryParams) => [
  "grades",
  params,
]

export function useGradesQuery(params: UseGradesQueryParams) {
  return useQuery({
    queryKey: gradesQueryKey(params),
    queryFn: () => fetchGrades(params),
    placeholderData: (previous) => previous,
  })
}

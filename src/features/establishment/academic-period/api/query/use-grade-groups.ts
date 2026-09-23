import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  GradeGroup,
  GradeGroupsQueryRequest,
  GradeGroupsQueryResponse,
} from "@/features/establishment/academic-period/api/types/grade-group"

interface UseGradeGroupsQueryParams {
  filters: GradeGroupsQueryRequest["filters"]
  sorting: GradeGroupsQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
  gradeId?: number
  enabled?: boolean
}

interface GradeGroupRow {
  id: number
  codigo: string
  jornada: string
  jornada_name: string
  director_id: number | null
  director_name: string | null
  metodologia: string | null
  metodologia_name: string | null
  cupo: number
  total_count: number
}
interface GradeGroupsRawResponse {
  rows: GradeGroupRow[]
}

function toGradeGroup(row: GradeGroupRow): GradeGroup {
  return {
    id: row.id,
    codigo: row.codigo,
    jornada: row.jornada,
    jornadaName: row.jornada_name,
    directorId: row.director_id,
    directorName: row.director_name ?? undefined,
    metodologia: row.metodologia ?? undefined,
    metodologiaName: row.metodologia_name ?? undefined,
    cupo: row.cupo,
  }
}

async function fetchGradeGroups(
  params: UseGradeGroupsQueryParams
): Promise<GradeGroupsQueryResponse> {
  if (params.gradeId == null) return { rows: [], pageCount: 1, totalCount: 0 }
  const [primary] = params.sorting
  const body: Record<string, string> = {
    PAGE_INDEX: String(params.pageIndex),
    PAGE_SIZE: String(params.pageSize),
  }
  if (params.filters.codigo) body.FILTRO = params.filters.codigo
  if (primary) {
    body.SORTING_ID = primary.id
    body.SORTING_DESC = String(primary.desc)
  }
  const raw: GradeGroupsRawResponse = await api.post(
    `/eval-col/grados/${params.gradeId}/grupos/query`,
    body,
  )
  let rows = (raw.rows ?? []).map(toGradeGroup)
  if (params.filters.jornada) {
    rows = rows.filter((row) => row.jornada === params.filters.jornada)
  }
  if (params.filters.directorName) {
    rows = rows.filter((row) => row.directorName === params.filters.directorName)
  }
  const totalCount = raw.rows?.[0]?.total_count ?? 0
  const pageCount = Math.max(1, Math.ceil(totalCount / params.pageSize))
  return { rows, pageCount, totalCount }
}

export const gradeGroupsQueryKey = (params: UseGradeGroupsQueryParams) => {
  const { enabled: _enabled, ...key } = params
  return ["grade-groups", key]
}

export function useGradeGroupsQuery(params: UseGradeGroupsQueryParams) {
  return useQuery({
    queryKey: gradeGroupsQueryKey(params),
    queryFn: () => fetchGradeGroups(params),
    placeholderData: (previous) => previous,
    enabled: params.enabled ?? true,
  })
}

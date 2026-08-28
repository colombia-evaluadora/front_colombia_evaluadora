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
}

// Fila cruda de `POST /eval-col/grados/:FK_GRADO/grupos/query` (`fn_grupo_listar`,
// id_query 65 — FK_GRADO va por path (`:PARAM.FK_GRADO`), el resto de
// filtros por body (`:BODY.*`)). `codigo` en realidad es `gr.NOMBRE` —
// TGRUPO.CODIGO no lo usa esta función (confirmado leyendo el body).
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
    director: row.director_name ?? "",
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
  // Las llaves del body deben matchear EXACTAMENTE el `:BODY.X` del SQL:
  // FILTRO, PAGE_INDEX, PAGE_SIZE, SORTING_ID, SORTING_DESC (UPPER_SNAKE_CASE).
  // FK_GRADO va por path (`:PARAM.FK_GRADO`), no por body.
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
  // `fn_grupo_listar` solo filtra por nombre; jornada/director se filtran en cliente.
  if (params.filters.jornada) {
    rows = rows.filter((row) => row.jornada === params.filters.jornada)
  }
  if (params.filters.director) {
    rows = rows.filter((row) => row.director === params.filters.director)
  }
  const totalCount = raw.rows?.[0]?.total_count ?? 0
  const pageCount = Math.max(1, Math.ceil(totalCount / params.pageSize))
  return { rows, pageCount, totalCount }
}

export const gradeGroupsQueryKey = (params: UseGradeGroupsQueryParams) => ["grade-groups", params]

export function useGradeGroupsQuery(params: UseGradeGroupsQueryParams) {
  return useQuery({
    queryKey: gradeGroupsQueryKey(params),
    queryFn: () => fetchGradeGroups(params),
    placeholderData: (previous) => previous,
  })
}

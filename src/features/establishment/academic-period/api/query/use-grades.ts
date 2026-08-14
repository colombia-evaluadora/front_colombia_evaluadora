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

// Fila cruda de `POST /eval-col/grados/query/:FK_PERIODO` (`fn_grado_listar`,
// id_query 60 — pasó de GET a POST en V75).
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
  // `POST /eval-col/grados/query/:FK_PERIODO` (`fn_grado_listar`, id_query 60
  // — pasó de GET a POST en V75; los filtros/orden van en body, solo
  // `FK_PERIODO` queda como path param). `SORTING_ID`/`SORTING_DESC` son
  // TEXT (CAST en la función), no boolean — se manda como "true"/"false".
  const raw: GradesRawResponse = await api.query(
    `/eval-col/grados/query/${params.academicPeriodId}`,
    {
      FILTRO: params.filters.nombre ?? null,
      PAGE_INDEX: params.pageIndex,
      PAGE_SIZE: params.pageSize,
      SORTING_ID: primary?.id ?? null,
      SORTING_DESC: primary ? String(primary.desc) : null,
    }
  )
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

export const gradesQueryKey = (params: UseGradesQueryParams) => ["grades", params]

export function useGradesQuery(params: UseGradesQueryParams) {
  return useQuery({
    queryKey: gradesQueryKey(params),
    queryFn: () => fetchGrades(params),
    placeholderData: (previous) => previous,
  })
}

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  Grade,
  GradesQueryRequest,
  GradesQueryResponse,
} from "@/features/establishment/academic-period/api/types/grade"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"
import { toPaginated } from "@/lib/pagination"
import {
  fromRecesosRows,
  type RecesoRow,
} from "@/features/establishment/academic-period/utils/recesos"
import { proveedorMeta } from "@/lib/offline/query-meta"

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
  // V43: columnas nuevas de `fn_grado_obtener`/listar (pendientes en el listado).
  jornadas_continuidad?: { id: number; name: string }[] | null
  personalizar_horario?: "S" | "N" | null
  schedule_start_time?: string | null
  schedule_end_time?: string | null
  blocks_count?: number | null
  recesos?: RecesoRow[] | null
  groups_count?: number | null
  total_capacity?: number | null
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
    jornadasContinuidad: row.jornadas_continuidad ?? [],
    personalizarHorario: row.personalizar_horario === "S",
    horaInicio: row.schedule_start_time?.slice(0, 5) ?? null,
    horaFin: row.schedule_end_time?.slice(0, 5) ?? null,
    bloques: row.blocks_count ?? null,
    recesos: fromRecesosRows(row.recesos),
    gruposCount: row.groups_count ?? 0,
    cupoTotal: row.total_capacity ?? 0,
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
  // El total es el del servidor (pagina él); el filtro de abajo es solo de la página.
  const page = toPaginated(raw.rows, { pageSize: params.pageSize, map: toGrade })
  let rows = page.rows
  // `fn_grado_listar` no filtra por nivel de enseñanza; se filtra en cliente.
  if (params.filters.teachingLevelIds?.length) {
    rows = rows.filter((row) =>
      params.filters.teachingLevelIds?.includes(row.teachingLevelId)
    )
  }
  return { ...page, rows }
}

export function useGradesQuery(params: UseGradesQueryParams) {
  return useQuery({
    meta: proveedorMeta(),
    queryKey: academicPeriodKeys.grades.list(params),
    queryFn: () => fetchGrades(params),
    placeholderData: (previous) => previous,
  })
}

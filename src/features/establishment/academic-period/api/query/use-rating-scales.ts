import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  RatingScale,
  RatingScaleType,
  RatingScalesQueryRequest,
  RatingScalesQueryResponse,
  TeachingLevel,
} from "@/features/establishment/academic-period/api/types/rating-scales"
import { fetchTeachingLevels } from "@/features/establishment/academic-period/api/query/use-teaching-levels"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"
import { proveedorMeta } from "@/lib/offline/query-meta"

interface UseRatingScalesQueryParams {
  filters: RatingScalesQueryRequest["filters"]
  sorting: RatingScalesQueryRequest["sorting"]
  teachingLevelId?: number
  academicPeriodId?: number
}

interface RatingScaleRow {
  id: number
  nombre: string
  abreviacion: string
  tipo: string
  tipo_name: string
  iconografia: string
  teaching_level_id: number
  nota_minima: number
  nota_maxima: number
  nota_equivalente: number
  total_count: number
  // Cada nivel tiene su propia TESCALA, así que este valor es distinto por fila
  // aunque varias filas terminen agrupadas bajo el mismo `RatingScale.codigo`.
  escala_id: number
  // V71.1; null si la banda no tiene descripción.
  descripcion?: string | null
}
interface RatingScaleRawResponse {
  rows: RatingScaleRow[]
}

function groupRatingScales(
  rows: RatingScaleRow[],
  levelsById: Map<number, TeachingLevel>
): RatingScale[] {
  const groups = new Map<string, RatingScale>()
  for (const row of rows) {
    const key = [row.nombre, row.abreviacion, row.tipo].join("\u0000")
    const level = levelsById.get(row.teaching_level_id)
    const existing = groups.get(key)
    if (existing) {
      if (!existing.teachingLevelIds.includes(row.teaching_level_id)) {
        existing.teachingLevelIds.push(row.teaching_level_id)
        if (level) existing.teachingLevels.push(level)
        existing.bandaIdsByLevel.push(row.id)
        existing.escalaIdsByLevel.push(row.escala_id)
      }
      continue
    }
    groups.set(key, {
      codigo: row.id,
      teachingLevelIds: [row.teaching_level_id],
      teachingLevels: level ? [level] : [],
      bandaIdsByLevel: [row.id],
      escalaIdsByLevel: [row.escala_id],
      nombre: row.nombre,
      abreviacion: row.abreviacion,
      tipo: row.tipo as RatingScaleType,
      tipoName: row.tipo_name,
      iconografia: row.iconografia,
      notaMaxima: row.nota_maxima,
      notaMinima: row.nota_minima,
      notaEquivalente: row.nota_equivalente,
      descripcion: row.descripcion ?? "",
    })
  }
  return Array.from(groups.values())
}

async function fetchRatingScales(
  params: UseRatingScalesQueryParams
): Promise<RatingScalesQueryResponse> {
  if (params.academicPeriodId == null) return { rows: [] }

  const filtro = params.filters.nombre || params.filters.abreviacion
  const [raw, levels] = await Promise.all([
    api.query<RatingScaleRawResponse>(
      `/eval-col/escalas/${params.academicPeriodId}`,
      {
        FILTRO: filtro ?? null,
        TEACHING_LEVEL_ID: params.teachingLevelId ?? null,
      }
    ),
    fetchTeachingLevels(),
  ])
  const levelsById = new Map(levels.map((level) => [level.id, level]))
  let rows = groupRatingScales(raw.rows ?? [], levelsById)
  if (params.filters.tipo?.length) {
    rows = rows.filter((scale) => params.filters.tipo?.includes(scale.tipo))
  }
  return { rows }
}

export function useRatingScalesQuery(params: UseRatingScalesQueryParams) {
  return useQuery({
    meta: proveedorMeta(),
    queryKey: academicPeriodKeys.ratingScales.list(params),
    queryFn: () => fetchRatingScales(params),
    placeholderData: (previous) => previous,
  })
}

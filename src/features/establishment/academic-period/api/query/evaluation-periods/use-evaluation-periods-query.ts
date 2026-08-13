import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  EvaluationPeriod,
  EvaluationPeriodsQueryFilters,
  EvaluationPeriodsQueryResponse,
} from "../../types/evaluation-period"

interface UseEvaluationPeriodsQueryParams {
  filters: EvaluationPeriodsQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
  academicPeriodId?: number
}

// Body PLANO (UPPER_SNAKE) que espera `POST /periodo-evaluacion/query`
// (`fn_periodo_eval_listar`). El signature probado por Thunder Client todavía
// no tiene SORT_BY/SORT_DIR, pero se va a agregar igual que en
// `fn_periodo_listar` — se manda desde ya (el back los ignora hasta que exista).
interface EvaluationPeriodsListRequest {
  FK_PERIODO: number | null
  FILTRO: string | null
  PAGEINDEX: number
  PAGESIZE: number
  SORT_BY: string | null
  SORT_DIR: "asc" | "desc" | null
}

function toListRequest(
  params: UseEvaluationPeriodsQueryParams
): EvaluationPeriodsListRequest {
  const [primary] = params.sorting
  return {
    FK_PERIODO: params.academicPeriodId ?? null,
    FILTRO: params.filters.filtro ?? null,
    PAGEINDEX: params.pageIndex,
    PAGESIZE: params.pageSize,
    SORT_BY: primary?.id ?? null,
    SORT_DIR: primary ? (primary.desc ? "desc" : "asc") : null,
  }
}

// Fila cruda tal como la devuelve el endpoint (snake_case + `total_count`
// repetido por fila, mismo patrón que `fn_periodo_listar`).
// ⚠️ Nombres de columna asumidos por convención con el resto del módulo —
// confirmar contra el `RETURNS TABLE` real de `fn_periodo_eval_listar`.
export interface EvaluationPeriodListRow {
  id: number
  codigo: number
  nombre: string
  abreviacion: string
  fecha_inicio: string
  fecha_fin: string
  fk_estado: number
  estado: string
  estado_name: string
  porcentaje: number
  total_count: number
}

interface EvaluationPeriodsListRawResponse {
  rows: EvaluationPeriodListRow[]
}

// El backend manda fecha con hora (ISO); el front trabaja con "yyyy-MM-dd".
function toDateOnly(value: string): string {
  return value ? value.slice(0, 10) : value
}

export function toEvaluationPeriod(row: EvaluationPeriodListRow): EvaluationPeriod {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    abreviacion: row.abreviacion,
    startDate: toDateOnly(row.fecha_inicio),
    endDate: toDateOnly(row.fecha_fin),
    peso: row.porcentaje,
    estado: row.estado as EvaluationPeriod["estado"],
    estadoId: row.fk_estado,
    estadoName: row.estado_name,
  }
}

async function fetchEvaluationPeriods(
  params: UseEvaluationPeriodsQueryParams
): Promise<EvaluationPeriodsQueryResponse> {
  const raw = await api.query<EvaluationPeriodsListRawResponse>(
    "/eval-col/periodo-evaluacion/query",
    toListRequest(params)
  )
  const backendRows = raw.rows ?? []
  // `total_count` viene repetido por fila (window count); el front arma el envelope.
  const totalCount = backendRows[0]?.total_count ?? 0
  const pageCount = Math.max(1, Math.ceil(totalCount / params.pageSize))
  return {
    rows: backendRows.map(toEvaluationPeriod),
    pageCount,
    totalCount,
  }
}

export const evaluationPeriodsQueryKey = (
  params: UseEvaluationPeriodsQueryParams
) => ["evaluation-periods", params]

export function useEvaluationPeriodsQuery(
  params: UseEvaluationPeriodsQueryParams
) {
  return useQuery({
    queryKey: evaluationPeriodsQueryKey(params),
    queryFn: () => fetchEvaluationPeriods(params),
    placeholderData: (previous) => previous,
  })
}

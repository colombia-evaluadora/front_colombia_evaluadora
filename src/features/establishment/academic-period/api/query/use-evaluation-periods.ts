import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  EvaluationPeriod,
  EvaluationPeriodsQueryFilters,
  EvaluationPeriodsQueryResponse,
} from "@/features/establishment/academic-period/api/types/evaluation-period"

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
// repetido por fila), confirmado por ThunderClient contra la respuesta real
// de `fn_periodo_eval_listar`.
export interface EvaluationPeriodListRow {
  id: number
  codigo: string
  nombre: string
  abreviacion: string
  start_date: string
  end_date: string
  peso: number
  status_id: number
  estado: string
  estado_name: string
  academic_period_id: number
  // Solo viene en el listado (window count); el detalle no lo trae.
  total_count?: number
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
    startDate: toDateOnly(row.start_date),
    endDate: toDateOnly(row.end_date),
    peso: row.peso,
    estado: row.estado as EvaluationPeriod["estado"],
    estadoId: row.status_id,
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

export const evaluationPeriodsQueryKey = (params: UseEvaluationPeriodsQueryParams) => [
  "evaluation-periods",
  params,
]

export function useEvaluationPeriodsQuery(params: UseEvaluationPeriodsQueryParams) {
  return useQuery({
    queryKey: evaluationPeriodsQueryKey(params),
    queryFn: () => fetchEvaluationPeriods(params),
    placeholderData: (previous) => previous,
  })
}

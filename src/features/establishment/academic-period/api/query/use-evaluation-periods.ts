import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  EvaluationPeriod,
  EvaluationPeriodsQueryFilters,
  EvaluationPeriodsQueryResponse,
} from "@/features/establishment/academic-period/api/types/evaluation-period"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"
import { toPaginated } from "@/lib/pagination"

interface UseEvaluationPeriodsQueryParams {
  filters: EvaluationPeriodsQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
  academicPeriodId?: number
  enabled?: boolean
}

interface EvaluationPeriodsListRequest {
  FK_PERIODO: number | null
  FILTRO: string | null
  PAGEINDEX: number
  PAGESIZE: number
  SORT_BY: string | null
  SORT_DIR: "asc" | "desc" | null
}

export function toEvaluationPeriodsFilters(
  params: Omit<UseEvaluationPeriodsQueryParams, "pageIndex" | "pageSize">,
) {
  const { PAGEINDEX: _i, PAGESIZE: _s, SORT_BY: _b, SORT_DIR: _d, ...filtros } = toListRequest({
    ...params,
    pageIndex: 0,
    pageSize: 0,
  })
  return filtros
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
  total_count?: number
}

interface EvaluationPeriodsListRawResponse {
  rows: EvaluationPeriodListRow[]
}

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
  return toPaginated(backendRows, { pageSize: params.pageSize, map: toEvaluationPeriod })
}

export function useEvaluationPeriodsQuery(params: UseEvaluationPeriodsQueryParams) {
  return useQuery({
    queryKey: academicPeriodKeys.evaluationPeriods.list(params),
    queryFn: () => fetchEvaluationPeriods(params),
    placeholderData: (previous) => previous,
    enabled: params.enabled ?? true,
  })
}

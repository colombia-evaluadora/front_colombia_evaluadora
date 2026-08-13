import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  AcademicPeriod,
  AcademicPeriodStatus,
  AcademicPeriodsQueryRequest,
  AcademicPeriodsQueryResponse,
} from "@/features/establishment/academic-period/api/types/academic-period"

interface UseAcademicPeriodsQueryParams {
  filters: AcademicPeriodsQueryRequest["filters"]
  sorting: AcademicPeriodsQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

// Body PLANO (UPPER_SNAKE) que espera el endpoint
// /eval-col/periodos-academicos/query. El front arma el envelope/naming; el
// backend recibe estos campos y los pasa a `fn_periodo_listar`.
interface AcademicPeriodsListRequest {
  FK_SEDE: number | null
  NOMBRE_SEDE: string | null
  ANO: string | null
  FK_ESTADO: number | null
  FECHA_DESDE: string | null
  FECHA_HASTA: string | null
  PAGEINDEX: number
  PAGESIZE: number
  SORT_BY: string | null
  SORT_DIR: "asc" | "desc" | null
}

function toListRequest(
  params: UseAcademicPeriodsQueryParams
): AcademicPeriodsListRequest {
  const { filters, sorting, pageIndex, pageSize } = params
  const [primary] = sorting
  return {
    // El front filtra la sede por nombre (no por id) → FK_SEDE va null.
    FK_SEDE: null,
    NOMBRE_SEDE: filters.sedeName ?? null,
    // El back filtra el año por NOMBRE ("2026") → se manda como texto.
    ANO: filters.schoolYearId != null ? String(filters.schoolYearId) : null,
    // El back acepta un solo estado; se toma el primero del multi-select.
    FK_ESTADO: filters.statusId?.[0] ?? null,
    FECHA_DESDE: filters.startFrom ?? null,
    FECHA_HASTA: filters.startTo ?? null,
    PAGEINDEX: pageIndex,
    PAGESIZE: pageSize,
    // Orden: primera columna del sorting de la tabla.
    SORT_BY: primary?.id ?? null,
    SORT_DIR: primary ? (primary.desc ? "desc" : "asc") : null,
  }
}

// Fila cruda tal como la devuelve el endpoint (snake_case, fechas ISO, códigos).
interface AcademicPeriodListRow {
  id: number
  sede_id: number
  sede_name: string
  school_year_id: number
  school_year_name: string
  status_id: number
  status: string
  status_name: string
  start_date: string
  end_date: string
  enrollment_deadline: string
  name: string
  jornada_id: number
  jornada: string
  jornada_name: string
  reserva: "S" | "N"
  default_blocks_count: number
  schedule_start_time: string
  schedule_end_time: string
  total_count: number
}

interface AcademicPeriodsListRawResponse {
  rows: AcademicPeriodListRow[]
}

// El backend manda fecha con hora (ISO); la tabla trabaja con "yyyy-MM-dd".
function toDateOnly(value: string): string {
  return value ? value.slice(0, 10) : value
}

function toAcademicPeriod(row: AcademicPeriodListRow): AcademicPeriod {
  return {
    id: row.id,
    sedeId: String(row.sede_id),
    sedeName: row.sede_name,
    // El listado no trae el periodo anterior; se resuelve en el detalle.
    previousPeriodId: null,
    // En el modelo del front `schoolYearId` es el AÑO (no el PK del año lectivo);
    // se toma de school_year_name ("2024").
    schoolYearId: Number(row.school_year_name),
    status: row.status as AcademicPeriodStatus,
    statusId: row.status_id,
    statusName: row.status_name,
    startDate: toDateOnly(row.start_date),
    endDate: toDateOnly(row.end_date),
    enrollmentDeadline: toDateOnly(row.enrollment_deadline),
    // Campos legacy que el listado no expone.
    minAbsences: null,
    weeksCount: null,
    minFailedSubjects: null,
    name: row.name,
    isPrincipal: false,
  }
}

async function fetchAcademicPeriods(
  params: UseAcademicPeriodsQueryParams
): Promise<AcademicPeriodsQueryResponse> {
  const raw = await api.query<AcademicPeriodsListRawResponse>(
    "/eval-col/periodos-academicos/query",
    toListRequest(params)
  )
  const backendRows = raw.rows ?? []
  // `total_count` viene repetido por fila (window count); el front arma el envelope.
  const totalCount = backendRows[0]?.total_count ?? 0
  const pageCount = Math.max(1, Math.ceil(totalCount / params.pageSize))
  return {
    rows: backendRows.map(toAcademicPeriod),
    pageCount,
    totalCount,
  }
}

export const academicPeriodsQueryKey = (
  params: UseAcademicPeriodsQueryParams
) => ["academic-periods", params]

export function useAcademicPeriodsQuery(params: UseAcademicPeriodsQueryParams) {
  return useQuery({
    queryKey: academicPeriodsQueryKey(params),
    queryFn: () => fetchAcademicPeriods(params),
    placeholderData: (previous) => previous,
  })
}

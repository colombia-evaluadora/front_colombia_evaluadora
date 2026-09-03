import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  Matricula,
  MatriculaQueryRequest,
  MatriculaQueryResponse,
  MatriculaStatus,
} from "@/features/coverage/api/types/matricula"
import type { EducationLevel } from "@/features/coverage/api/types/reservation"

interface UseMatriculaQueryParams {
  filters: MatriculaQueryRequest["filters"]
  sorting: MatriculaQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

interface MatriculaListRequest {
  SEARCH: string | null
  STATUSES: string[] | null
  CAMPUS: string | null
  SHIFT: string | null
  GRADE: number | null
  GROUP: string | null
  PAGEINDEX: number
  PAGESIZE: number
  SORTBY: string | null
  SORTDIR: "asc" | "desc" | null
}

export function toMatriculaFilters(filters: MatriculaQueryRequest["filters"]) {
  const { PAGEINDEX: _i, PAGESIZE: _s, SORTBY: _b, SORTDIR: _d, ...filtros } = toListRequest({
    filters,
    sorting: [],
    pageIndex: 0,
    pageSize: 0,
  })
  return filtros
}

function toListRequest(params: UseMatriculaQueryParams): MatriculaListRequest {
  const { filters, sorting, pageIndex, pageSize } = params
  const [primary] = sorting
  return {
    SEARCH: filters.search || null,
    STATUSES: filters.statuses?.length ? filters.statuses : null,
    CAMPUS: filters.campus || null,
    SHIFT: filters.shift || null,
    GRADE: filters.grade ?? null,
    GROUP: filters.group || null,
    PAGEINDEX: pageIndex,
    PAGESIZE: pageSize,
    SORTBY: primary?.id ?? null,
    SORTDIR: primary ? (primary.desc ? "desc" : "asc") : null,
  }
}

interface MatriculaListRow {
  id: number
  document_number: string
  first_name: string
  last_name: string
  institution: string
  campus: string
  shift: string
  education_level: EducationLevel
  grade: number
  grupo: string
  enrollment_date: string
  guardian: string | null
  status: MatriculaStatus
  has_grades: boolean
  total_count: number
}

interface MatriculaListRawResponse {
  rows: MatriculaListRow[]
}

function toMatricula(row: MatriculaListRow): Matricula {
  return {
    id: String(row.id),
    documentNumber: row.document_number,
    firstName: row.first_name,
    lastName: row.last_name,
    institution: row.institution,
    campus: row.campus,
    shift: row.shift,
    educationLevel: row.education_level,
    grade: row.grade,
    group: row.grupo,
    enrollmentDate: row.enrollment_date,
    // El backend no manda acudiente cuando FK_TPADRE es null (aún no migrado
    // para todos los registros) -- la tabla ya maneja el string vacío.
    guardian: row.guardian ?? "",
    status: row.status,
    hasGrades: row.has_grades,
  }
}

async function fetchMatricula(params: UseMatriculaQueryParams): Promise<MatriculaQueryResponse> {
  const raw = await api.query<MatriculaListRawResponse>(
    "/eval-col/matricula/query",
    toListRequest(params),
  )
  const backendRows = raw.rows ?? []
  // `total_count` viene repetido por fila (window count); el front arma el envelope.
  const totalCount = backendRows[0]?.total_count ?? 0
  const pageCount = Math.max(1, Math.ceil(totalCount / params.pageSize))
  return {
    rows: backendRows.map(toMatricula),
    pageCount,
    totalCount,
  }
}

export const matriculaQueryKey = (params: UseMatriculaQueryParams) => ["matricula", params]

export function useMatriculaQuery(params: UseMatriculaQueryParams) {
  return useQuery({
    queryKey: matriculaQueryKey(params),
    queryFn: () => fetchMatricula(params),
    placeholderData: (previous) => previous,
  })
}

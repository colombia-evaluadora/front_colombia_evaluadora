import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  Matricula,
  MatriculaQueryRequest,
  MatriculaQueryResponse,
  MatriculaStatus,
} from "@/features/coverage/matricula/api/types/matricula"
import type { EducationLevel } from "@/features/coverage/reservations/api/types/reservation"
import { toPaginated } from "@/lib/pagination"
import { matriculaKeys } from "@/features/coverage/matricula/api/query-keys"
import { listaBlancaMeta } from "@/lib/offline/query-meta"

export interface UseMatriculaQueryParams {
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

export async function fetchMatricula(params: UseMatriculaQueryParams): Promise<MatriculaQueryResponse> {
  const raw = await api.query<MatriculaListRawResponse>(
    "/eval-col/matricula/query",
    toListRequest(params),
  )
  const backendRows = raw.rows ?? []
  // `total_count` viene repetido por fila (window count); el front arma el envelope.
  return toPaginated(backendRows, { pageSize: params.pageSize, map: toMatricula })
}

/**
 * P6 (política de datos de menores, decidida para Cobertura): la lista de
 * matrícula se puede CONSULTAR sin conexión, pero en el equipo solo se guardan
 * los datos básicos. Lista blanca sobre `Matricula` (camelCase de dominio, que
 * es lo que vive en el cache): identificación técnica (`id`), nombre,
 * documento (tipo y número), dónde está matriculado (colegio, sede, jornada,
 * nivel, grado, grupo), estado y fechas. Queda FUERA el acudiente
 * (`guardian`), `hasGrades` y cualquier campo que el backend agregue mañana
 * (salud, dirección, teléfono, correo, foto…): `selectRowFields` copia solo lo
 * listado. `documentType` aún no viene en `/matricula/query`; está listado para
 * que entre sin tocar la lista si el backend lo agrega.
 *
 * Con red, la pantalla sigue mostrando todo: el recorte aplica solo a la copia
 * persistida (`persistSelect`).
 */
export const MATRICULA_OFFLINE_FIELDS = [
  "id",
  "documentType",
  "documentNumber",
  "firstName",
  "lastName",
  "institution",
  "campus",
  "shift",
  "educationLevel",
  "grade",
  "group",
  "status",
  "enrollmentDate",
] as const satisfies readonly (keyof Matricula | "documentType")[]

export const matriculaListaMeta = () => listaBlancaMeta(MATRICULA_OFFLINE_FIELDS)

/**
 * Vista por defecto de la pantalla (sin filtros, primera página, sin orden):
 * la baja "Preparar sin conexión" con esta misma key. El backend ya acota la
 * lista a los periodos (sedes) del usuario (`fn_periodo_usuario_periodos`).
 */
export const MATRICULA_LISTA_POR_DEFECTO: UseMatriculaQueryParams = {
  filters: {},
  sorting: [],
  pageIndex: 0,
  pageSize: 10,
}

export function useMatriculaQuery(params: UseMatriculaQueryParams) {
  return useQuery({
    queryKey: matriculaKeys.lista(params),
    queryFn: () => fetchMatricula(params),
    meta: matriculaListaMeta(),
    // Lo restaurado del equipo es la copia recortada (sin acudiente): con red
    // se vuelve a pedir siempre al montar, para mostrar la lista completa. Sin
    // red el refetch se pausa y se ve lo guardado.
    staleTime: 0,
    placeholderData: (previous) => previous,
  })
}

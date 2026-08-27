import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  EmployeeListItem,
  EmployeeStatus,
} from "@/features/establishment/employees/api/types/employee"

interface UseAssignmentTeachersQueryParams {
  academicPeriodId?: number
  search?: string
  status?: EmployeeStatus | ""
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

interface AssignmentTeacherRow {
  funcionario_id: number
  document_number: string
  nombre_completo: string
  estado: string
  total_count: number
}
interface AssignmentTeachersRawResponse {
  rows: AssignmentTeacherRow[]
}

interface AssignmentTeachersResponse {
  rows: EmployeeListItem[]
  pageCount: number
  totalCount: number
}

function toEmployeeStatus(estado: string): EmployeeStatus {
  return estado === "ACTIVO" ? "ACTIVE" : "SUSPENDED"
}

// Shapea la fila del docente como `EmployeeListItem` para reusar las mismas
// columnas que el módulo de empleados (`columns-academic-assignments.tsx`
// solo lee `documentNumber`/`name`/`statuses`) — `roles`/`campuses`/
// `workSchedules` no vienen de este endpoint porque esas columnas no se
// renderizan acá, y quedan vacíos.
function toEmployeeListItem(row: AssignmentTeacherRow): EmployeeListItem {
  return {
    id: row.funcionario_id,
    documentNumber: row.document_number,
    name: row.nombre_completo,
    roles: [],
    campuses: [],
    workSchedules: [],
    statuses: [toEmployeeStatus(row.estado)],
  }
}

async function fetchAssignmentTeachers(
  params: UseAssignmentTeachersQueryParams,
): Promise<AssignmentTeachersResponse> {
  if (params.academicPeriodId == null) {
    return { rows: [], pageCount: 1, totalCount: 0 }
  }
  const [primary] = params.sorting
  const body: Record<string, string> = {
    PAGE_INDEX: String(params.pageIndex),
    PAGE_SIZE: String(params.pageSize),
  }
  if (params.search) body.FILTRO = params.search
  if (params.status) body.ESTADO = params.status === "ACTIVE" ? "A" : "I"
  if (primary) {
    body.SORT_BY = primary.id
    body.SORT_DIR = primary.desc ? "desc" : "asc"
  }

  // `PERIODO_ACADEMICO_ID` va por path param (V85) — identifica el recurso
  // que se lista, no un filtro sobre él.
  const raw: AssignmentTeachersRawResponse = await api.post(
    `/eval-col/asignaciones/docentes/${params.academicPeriodId}`,
    body,
  )
  const rows = (raw.rows ?? []).map(toEmployeeListItem)
  const totalCount = raw.rows?.[0]?.total_count ?? 0
  const pageCount = Math.max(1, Math.ceil(totalCount / params.pageSize))
  return { rows, pageCount, totalCount }
}

export const assignmentTeachersQueryKey = (params: UseAssignmentTeachersQueryParams) => [
  "assignment-teachers",
  params,
]

export function useAssignmentTeachersQuery(params: UseAssignmentTeachersQueryParams) {
  return useQuery({
    queryKey: assignmentTeachersQueryKey(params),
    queryFn: () => fetchAssignmentTeachers(params),
    placeholderData: (previous) => previous,
  })
}

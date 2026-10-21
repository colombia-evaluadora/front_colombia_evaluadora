import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { toSingleSort } from "@/lib/query-request-mapping"
import { unwrapPaginated } from "@/lib/response-envelope"
import { employeeKeys } from "@/features/establishment/employees/api/query-keys"

import type {
  EmployeeListItem,
  EmployeesQueryRequest,
  EmployeesQueryResponse,
} from "@/features/establishment/employees/api/types/employee"

// Exportado: la exportación debe normalizar los filtros igual que el listado.
export function toEmployeesQueryFilters(filters: EmployeesQueryRequest["filters"]) {
  // Viajan como código (binds VARCHAR[]), no como id.
  return {
    ...filters,
    roles: filters.roles ?? [],
    workSchedules: filters.workSchedules ?? [],
  }
}

interface UseEmployeesQueryParams {
  filters: EmployeesQueryRequest["filters"]
  sorting: EmployeesQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

/** `roles`/`sedes` son JSONB `[{id, nombre}]`; `estados_permisos` usa el dominio de `TLV_ESTADO`. */
interface RealEmployeeListRow {
  pk_empleado: number
  numero_documento: string
  nombre_completo: string
  fk_estado: string
  estado_label: string
  jornada_id: number | null
  jornada_nombre: string | null
  roles: { id: number; nombre: string }[]
  sedes: { id: number; nombre: string }[]
  estados_permisos: string[]
  correo_electronico: string | null
}

function toEmployeeListItem(row: RealEmployeeListRow): EmployeeListItem {
  return {
    id: row.pk_empleado,
    documentNumber: row.numero_documento,
    name: row.nombre_completo,
    roles: (row.roles ?? []).map((role) => ({ id: role.id, code: "", name: role.nombre })),
    campuses: (row.sedes ?? []).map((sede) => sede.nombre),
    workSchedules:
      row.jornada_id === null ? [] : [{ id: row.jornada_id, code: "", name: row.jornada_nombre ?? "" }],
    statuses: (row.estados_permisos ?? []).map((estado) => (estado === "ACTIVO" ? "ACTIVE" : "SUSPENDED")),
    email: row.correo_electronico?.trim() || undefined,
  }
}

async function fetchEmployees(params: EmployeesQueryRequest): Promise<EmployeesQueryResponse> {
  if (env.ENABLE_API_MOCKING) {
    const response = await api.query(
      apiPath("/establishments/employees/query", "/establecimientos/funcionarios/query"),
      params,
    )
    return unwrapPaginated(response)
  }

  // El mock espera `sorting` como array; el backend, un único objeto.
  const body = {
    filters: toEmployeesQueryFilters(params.filters),
    sorting: toSingleSort(params.sorting),
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
  }
  const response = await api.query(
    apiPath("/establishments/employees/query", "/establecimientos/funcionarios/query"),
    body,
  )
  const result = unwrapPaginated<RealEmployeeListRow>(response)
  return { ...result, rows: result.rows.map(toEmployeeListItem) }
}

export const employeesQueryKey = (params: UseEmployeesQueryParams) => employeeKeys.lista(params)

export function useEmployeesQuery(params: UseEmployeesQueryParams, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: employeesQueryKey(params),
    queryFn: () => fetchEmployees(params),
    placeholderData: (previous) => previous,
    enabled,
  })
}

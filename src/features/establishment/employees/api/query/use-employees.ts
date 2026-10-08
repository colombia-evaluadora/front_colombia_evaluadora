import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { toSingleSort } from "@/lib/query-request-mapping"
import { unwrapPaginated } from "@/lib/response-envelope"

import type {
  EmployeeListItem,
  EmployeesQueryRequest,
  EmployeesQueryResponse,
} from "@/features/establishment/employees/api/types/employee"

/**
 * Normaliza los filtros de la UI a lo que espera el backend.
 *
 * Hoy no convierte tipos: `roles` y `workSchedules` viajan como CÓDIGOS
 * (texto) porque desde V116 el backend filtra por código (binds `VARCHAR[]`),
 * no por id. Lo único que hace es garantizar un array vacío en lugar de
 * `undefined`, para que el bind siempre reciba un array.
 *
 * Se exporta —y no queda embebido en el body de la consulta— porque la
 * exportación manda EXACTAMENTE los mismos filtros y tiene que aplicar la
 * misma normalización. Cuando esto vivía solo dentro del hook de listado, la
 * tabla funcionaba y el reporte fallaba con 400 sobre los mismos filtros.
 */
export function toEmployeesQueryFilters(filters: EmployeesQueryRequest["filters"]) {
  // Viajan tal cual: desde V116 el backend filtra por CÓDIGO de rol y de
  // jornada, no por id, así que convertirlos a número rompería los binds
  // (VARCHAR[]).
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

/** Fila cruda de `fn_usu_empleados_listar_paginado` (V51) — `roles`/`sedes`
 * son JSONB `[{id, nombre}]`; `estados_permisos` es JSONB `["ACTIVO", ...]`
 * (el dominio de `TLV_ESTADO`, no "ACTIVE"/"SUSPENDED"). */
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

  // El mock espera `sorting` como array tal cual; el backend real espera un
  // único objeto (o null) — ver `toSingleSort`.
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

export const employeesQueryKey = (params: UseEmployeesQueryParams) => [
  "employees",
  params,
]

export function useEmployeesQuery(params: UseEmployeesQueryParams) {
  return useQuery({
    queryKey: employeesQueryKey(params),
    queryFn: () => fetchEmployees(params),
    placeholderData: (previous) => previous,
  })
}

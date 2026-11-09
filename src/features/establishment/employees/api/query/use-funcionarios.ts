import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPaginated } from "@/lib/pagination"
import { toSingleSort } from "@/lib/query-request-mapping"
import { employeeKeys } from "@/features/establishment/employees/api/query-keys"

import type {
  EstadoFuncionario,
  FuncionarioListItem,
  FuncionariosFilters,
  FuncionariosQueryParams,
} from "@/features/establishment/employees/api/types/funcionario"

/** Fila de `fn_fun_listar` (V579.5): `total_count` repetido en cada fila. */
interface FuncionarioRow {
  pk_empleado: number
  tipo_documento: string | null
  numero_documento: string
  nombre_completo: string
  usuario_soporte: boolean
  roles: { id: number; nombre: string }[] | null
  designaciones: string[] | null
  estado: EstadoFuncionario
  total_count: number
}

const toFuncionario = (row: FuncionarioRow): FuncionarioListItem => ({
  id: row.pk_empleado,
  documentType: row.tipo_documento ?? "",
  documentNumber: row.numero_documento,
  name: row.nombre_completo,
  isSupport: row.usuario_soporte === true,
  roles: (row.roles ?? []).map((role) => role.nombre).sort((a, b) => a.localeCompare(b, "es")),
  designations: row.designaciones ?? [],
  status: row.estado,
})

/** Exportado: la exportación manda los mismos filtros que el listado. Roles y jornadas viajan por código. */
export function toFuncionariosFilters(establishmentId: number, filters: FuncionariosFilters) {
  return {
    establishmentId,
    search: filters.search || null,
    roles: filters.roles ?? [],
    workSchedules: filters.workSchedules ?? [],
    statuses: filters.statuses ?? [],
    campusId: filters.campusId ?? null,
  }
}

async function fetchFuncionarios(params: FuncionariosQueryParams) {
  const rows = await evalCol.postRows<FuncionarioRow>("/establecimientos/funcionarios/query", {
    filters: toFuncionariosFilters(params.establishmentId, params.filters),
    sorting: toSingleSort(params.sorting),
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
  })
  return toPaginated(rows, { pageSize: params.pageSize, map: toFuncionario })
}

export function useFuncionariosQuery(params: FuncionariosQueryParams | null) {
  return useQuery({
    queryKey: employeeKeys.lista(params),
    queryFn: () => fetchFuncionarios(params as FuncionariosQueryParams),
    placeholderData: (previous) => previous,
    enabled: params != null,
  })
}

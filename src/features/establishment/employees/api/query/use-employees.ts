import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { toSingleSort } from "@/lib/query-request-mapping"
import { unwrapPaginated } from "@/lib/response-envelope"

import type {
  EmployeesQueryRequest,
  EmployeesQueryResponse,
} from "@/features/establishment/employees/api/types/employee"

interface UseEmployeesQueryParams {
  filters: EmployeesQueryRequest["filters"]
  sorting: EmployeesQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
  /**
   * Solo aplica en real: `filters.roles`/`filters.workSchedules` traen el
   * *código* del catálogo (así vive en la URL/el formulario, igual que en
   * el resto del filtro), pero `fn_usu_empleados_listar`/`_contar` (V51)
   * esperan `BIGINT[]` — los ids reales de `TROL`/`TLISTA_VALOR`, no el
   * código. El caller (table-employees.tsx) ya tiene los catálogos cargados
   * para resolver el código a id antes de mandarlos acá; el mock ignora
   * estos dos y sigue filtrando por código (`filters.roles`/`workSchedules`
   * tal cual).
   */
  roleIds?: number[]
  workScheduleIds?: number[]
}

async function fetchEmployees(
  params: EmployeesQueryRequest & { roleIds?: number[]; workScheduleIds?: number[] },
): Promise<EmployeesQueryResponse> {
  // El mock espera `sorting` como array tal cual; el backend real espera
  // un único objeto (o null) — ver `toSingleSort`. También en real se
  // reemplazan los códigos de rol/jornada por los ids resueltos (ver
  // `roleIds`/`workScheduleIds` en `UseEmployeesQueryParams`).
  const body = env.ENABLE_API_MOCKING
    ? params
    : {
        ...params,
        sorting: toSingleSort(params.sorting),
        filters: {
          ...params.filters,
          roles: params.roleIds ?? [],
          workSchedules: params.workScheduleIds ?? [],
        },
      }
  const response = await api.query(
    apiPath("/establishments/employees/query", "/establecimientos/funcionarios/query"),
    body,
  )
  return unwrapPaginated(response)
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
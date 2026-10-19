import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { roleMenuKeys } from "@/features/administration/roles-menus/api/query-keys"

/** Personas activas con el rol, en cualquier sede (fn_rol_funcionarios_contar). */
async function fetchRoleEmployeesCount(roleId: number): Promise<number> {
  const rows = await evalCol.getRows<{ total: number | string }>(
    `/roles/${roleId}/funcionarios/total`,
  )
  return Number(rows[0]?.total ?? 0)
}

export function useRoleEmployeesCountQuery(roleId: number | null, enabled = true) {
  return useQuery({
    queryKey: roleMenuKeys.roleMenus.funcionariosTotal(roleId),
    queryFn: () => fetchRoleEmployeesCount(roleId as number),
    enabled: roleId != null && enabled,
  })
}

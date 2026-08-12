import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

/** Ids de los menús que tiene asignados el rol. */
function fetchRoleMenus(roleId: number): Promise<number[]> {
  return api.get(`/roles/${roleId}/menus`)
}

export const roleMenusQueryKey = (roleId: number | null) => ["role-menus", roleId]

export function useRoleMenusQuery(roleId: number | null) {
  return useQuery({
    queryKey: roleMenusQueryKey(roleId),
    queryFn: () => fetchRoleMenus(roleId as number),
    enabled: roleId != null,
  })
}

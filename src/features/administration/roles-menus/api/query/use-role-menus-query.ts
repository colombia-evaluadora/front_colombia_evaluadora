import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

export interface RoleMenuAssignment {
  id: number
  soloLectura: boolean
}


async function fetchRoleMenus(roleId: number): Promise<RoleMenuAssignment[]> {
  const rows = await evalCol.getRows<{ id: number; soloLectura?: boolean } | number>(
    `/roles/${roleId}/menus`,
  )
  return rows.map((row) =>
    typeof row === "number" ? { id: row, soloLectura: false } : { id: row.id, soloLectura: row.soloLectura ?? false },
  )
}

export const roleMenusQueryKey = (roleId: number | null) => ["role-menus", roleId]

export function useRoleMenusQuery(roleId: number | null) {
  return useQuery({
    queryKey: roleMenusQueryKey(roleId),
    queryFn: () => fetchRoleMenus(roleId as number),
    enabled: roleId != null,
  })
}

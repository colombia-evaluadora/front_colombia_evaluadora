import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

/**
 * Ids de los menús que tiene asignados el rol, en el orden guardado para ese
 * rol (que no es el `menuOrder` del catálogo).
 *
 * El backend responde `{rows:[{id}, ...]}`, no una lista de números: una fila
 * de una sola columna no colapsa a escalar. La pantalla trabaja con ids, así
 * que la lista se aplana acá.
 */
async function fetchRoleMenus(roleId: number): Promise<number[]> {
  const rows = await evalCol.getRows<{ id: number } | number>(`/roles/${roleId}/menus`)
  return rows.map((row) => (typeof row === "number" ? row : row.id))
}

export const roleMenusQueryKey = (roleId: number | null) => ["role-menus", roleId]

export function useRoleMenusQuery(roleId: number | null) {
  return useQuery({
    queryKey: roleMenusQueryKey(roleId),
    queryFn: () => fetchRoleMenus(roleId as number),
    enabled: roleId != null,
  })
}

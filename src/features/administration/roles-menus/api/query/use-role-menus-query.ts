import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { roleMenuKeys } from "@/features/administration/roles-menus/api/query-keys"

export interface RoleMenuAssignment {
  id: number
  soloLectura: boolean
  /** El SSO todavía no los devuelve: si faltan, salen de `soloLectura`. */
  guardar: boolean
  eliminar: boolean
}

interface RoleMenuRow {
  id: number
  soloLectura?: boolean
  guardar?: boolean
  eliminar?: boolean
}

function toAssignment(row: RoleMenuRow | number): RoleMenuAssignment {
  if (typeof row === "number") return { id: row, soloLectura: false, guardar: true, eliminar: true }
  const soloLectura = row.soloLectura ?? false
  return {
    id: row.id,
    soloLectura,
    guardar: row.guardar ?? !soloLectura,
    eliminar: row.eliminar ?? !soloLectura,
  }
}

async function fetchRoleMenus(roleId: number): Promise<RoleMenuAssignment[]> {
  const rows = await evalCol.getRows<RoleMenuRow | number>(`/roles/${roleId}/menus`)
  return rows.map(toAssignment)
}

export function useRoleMenusQuery(roleId: number | null) {
  return useQuery({
    queryKey: roleMenuKeys.roleMenus.detalle(roleId),
    queryFn: () => fetchRoleMenus(roleId as number),
    enabled: roleId != null,
  })
}

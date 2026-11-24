import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { roleMenuKeys } from "@/features/administration/roles-menus/api/query-keys"

export interface RoleMenuAssignment {
  id: number
  /** `false`: la fila solo informa bloqueos de una vista que el rol no tiene. */
  acceso: boolean
  soloLectura: boolean
  /** El SSO todavía no los devuelve: si faltan, salen de `soloLectura`. */
  guardar: boolean
  eliminar: boolean
  /**
   * Acciones que el rol no puede tener en la vista y no se activan desde la pantalla (roles
   * territoriales, S.3.VRO.3/4). Pendiente de backend: hoy solo las trae el mock.
   */
  bloqueos?: ViewLocks
}

export interface ViewLocks {
  guardar?: boolean
  eliminar?: boolean
}

interface RoleMenuRow {
  id: number
  acceso?: boolean
  soloLectura?: boolean
  guardar?: boolean
  eliminar?: boolean
  bloqueos?: ViewLocks
}

function toAssignment(row: RoleMenuRow | number): RoleMenuAssignment {
  if (typeof row === "number")
    return { id: row, acceso: true, soloLectura: false, guardar: true, eliminar: true }
  const soloLectura = row.soloLectura ?? false
  return {
    id: row.id,
    acceso: row.acceso ?? true,
    soloLectura,
    guardar: row.guardar ?? !soloLectura,
    eliminar: row.eliminar ?? !soloLectura,
    ...(row.bloqueos ? { bloqueos: row.bloqueos } : {}),
  }
}

export async function fetchRoleMenus(roleId: number): Promise<RoleMenuAssignment[]> {
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

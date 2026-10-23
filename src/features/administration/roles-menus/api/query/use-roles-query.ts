import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { Role } from "@/features/administration/roles-menus/api/types/role-menu"
import { roleMenuKeys } from "@/features/administration/roles-menus/api/query-keys"

function fetchRoles(): Promise<Role[]> {
  return evalCol.getRows<Role>("/roles")
}

export function useRolesQuery() {
  return useQuery({
    queryKey: roleMenuKeys.roles,
    queryFn: fetchRoles,
    staleTime: Infinity,
  })
}

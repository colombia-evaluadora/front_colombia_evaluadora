import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { Role } from "@/features/administration/roles-menus/api/types/role-menu"

function fetchRoles(): Promise<Role[]> {
  return evalCol.getRows<Role>("/roles")
}

export const rolesQueryKey = () => ["roles"]

export function useRolesQuery() {
  return useQuery({
    queryKey: rolesQueryKey(),
    queryFn: fetchRoles,
    staleTime: Infinity,
  })
}

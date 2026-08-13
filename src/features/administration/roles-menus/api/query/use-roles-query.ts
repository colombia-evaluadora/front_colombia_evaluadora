import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type { Role } from "@/features/administration/roles-menus/api/types/role-menu"

function fetchRoles(): Promise<Role[]> {
  return api.get("/roles")
}

export const rolesQueryKey = () => ["roles"]

export function useRolesQuery() {
  return useQuery({
    queryKey: rolesQueryKey(),
    queryFn: fetchRoles,
    staleTime: Infinity,
  })
}

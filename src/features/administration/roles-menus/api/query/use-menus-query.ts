import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import type { MenuNode } from "@/features/administration/roles-menus/api/types/role-menu"

/** Catálogo completo de menús, sin filtrar por rol. */
function fetchMenus(): Promise<MenuNode[]> {
  return api.get("/menus")
}

export const menusQueryKey = () => ["menus"]

export function useMenusQuery() {
  return useQuery({
    queryKey: menusQueryKey(),
    queryFn: fetchMenus,
    staleTime: Infinity,
  })
}

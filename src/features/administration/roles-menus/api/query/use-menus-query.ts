import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { MenuNode } from "@/features/administration/roles-menus/api/types/role-menu"
import { roleMenuKeys } from "@/features/administration/roles-menus/api/query-keys"

/** Catálogo completo de menús, sin filtrar por rol. */
function fetchMenus(): Promise<MenuNode[]> {
  return evalCol.getRows<MenuNode>("/menus")
}

export function useMenusQuery() {
  return useQuery({
    queryKey: roleMenuKeys.menus.all,
    queryFn: fetchMenus,
    staleTime: Infinity,
  })
}

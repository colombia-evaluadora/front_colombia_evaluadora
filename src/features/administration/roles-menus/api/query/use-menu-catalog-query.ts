import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { MenuCatalogNode } from "@/features/administration/roles-menus/api/types/role-menu"
import { roleMenuKeys } from "@/features/administration/roles-menus/api/query-keys"

/** Catálogo con los menús inactivos: lo que administra la pestaña Módulos y submódulos. */
function fetchMenuCatalog(): Promise<MenuCatalogNode[]> {
  return evalCol.getRows<MenuCatalogNode>("/menus/catalogo")
}

export function useMenuCatalogQuery() {
  return useQuery({
    queryKey: roleMenuKeys.menus.catalogo,
    queryFn: fetchMenuCatalog,
  })
}

import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { menusQueryKey } from "@/features/administration/roles-menus/api/query/use-menus-query"
import type { MenuCatalogNode } from "@/features/administration/roles-menus/api/types/role-menu"

/** Catálogo con los menús inactivos: lo que administra la pestaña Módulos y submódulos. */
function fetchMenuCatalog(): Promise<MenuCatalogNode[]> {
  return evalCol.getRows<MenuCatalogNode>("/menus/catalogo")
}

// Cuelga de `menusQueryKey`: crear, editar, eliminar o reordenar ya la invalidan.
export const menuCatalogQueryKey = () => [...menusQueryKey(), "catalogo"]

export function useMenuCatalogQuery() {
  return useQuery({
    queryKey: menuCatalogQueryKey(),
    queryFn: fetchMenuCatalog,
  })
}

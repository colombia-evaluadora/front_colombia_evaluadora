import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toNavItemDtos } from "@/features/navigation/api/menu-mapper"
import { getNavIcon } from "@/features/navigation/api/ui-mappings"
import type { NavItem } from "@/features/navigation/api/types/nav-item"

import type { MenuNode } from "@/features/administration/roles-menus/api/types/role-menu"

/**
 * El menú del usuario sale de `GET /eval-col/menus`, que YA viene filtrado por
 * quien llama: la query 126 es `fn_list_available_menus(:CONTEXT.USER_ID)`, o
 * sea "los menús disponibles para mí". Un superadmin ve el catálogo completo,
 * y por eso la misma llamada le sirve a la pantalla de configuración de roles
 * y menús.
 *
 * Antes esto pegaba a `/sso-admin/myMenu?app=`, que lee el registro de rutas
 * del SSO — otra tabla, que no es la que edita esa pantalla: asignarle menús a
 * un rol no movía el sidebar.
 */
async function fetchNavItemsDto() {
  const menus = await evalCol.getRows<MenuNode>("/menus")
  return toNavItemDtos(menus)
}

async function fetchNavItems(): Promise<NavItem[]> {
  const items = await fetchNavItemsDto()
  return items.map((item) => ({
    ...item,
    icon: getNavIcon(item.icon),
  }))
}

export function useNavItemsQuery() {
  return useQuery({
    queryKey: ["navigation", "menu"],
    queryFn: fetchNavItems,
    staleTime: Infinity,
  })
}

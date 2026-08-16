import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toNavItemDtos } from "@/features/navigation/api/menu-mapper"
import { getNavIcon } from "@/features/navigation/api/ui-mappings"
import type { NavItem } from "@/features/navigation/api/types/nav-item"

import type { MenuNode } from "@/features/administration/roles-menus/api/types/role-menu"

/**
 * El sidebar sale de `GET /eval-col/my-menus` → `fn_list_my_menus`, que cruza
 * `role_users → role → trol → trol_menu` partiendo del usuario del token: es
 * "los menús que me tocan a mí", la unión de los de todos mis roles.
 *
 * NO usa `/menus` (query 126 → `fn_list_available_menus`): esa devuelve el
 * catálogo COMPLETO. Recibe `:CONTEXT.USER_ID` pero no filtra con él —solo
 * autoriza la llamada—, y su propia doc dice "Sin filtro por rol: el UI es
 * responsable de cruzar con trol_menu". Con ella, asignarle menús a un rol no
 * cambiaba nada de lo que veía el usuario. Sigue siendo la fuente correcta
 * para el panel "Menús disponibles", que justamente quiere el catálogo entero.
 *
 * Antes de eso pegaba a `/sso-admin/myMenu?app=`, que sí filtra por el JWT pero
 * lee OTRO registro (`public.route` vía `role_route`), no el `trol_menu` que
 * edita la pantalla de roles y menús.
 */
async function fetchNavItemsDto() {
  const menus = await evalCol.getRows<MenuNode>("/my-menus")
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

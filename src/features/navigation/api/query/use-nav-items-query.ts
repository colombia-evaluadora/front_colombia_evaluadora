import { queryOptions, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toNavItemDtos } from "@/features/navigation/api/menu-mapper"
import { getNavIcon } from "@/features/navigation/api/ui-mappings"
import type { NavItem, NavItemDto } from "@/features/navigation/api/types/nav-item"

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

// El cache guarda la forma CRUDA (íconos como texto): es serializable y se
// persiste en la `session` para el modo sin conexión (`lib/offline/session.ts`).
// El ícono se resuelve a componente en el `select` de `useNavItemsQuery`; el
// guard de `/app` solo necesita las URLs.
function resolveNavIcons(items: NavItemDto[]): NavItem[] {
  return items.map((item) => ({
    ...item,
    icon: getNavIcon(item.icon),
  }))
}

export const navItemsQueryOptions = queryOptions({
  queryKey: ["navigation", "menu"],
  queryFn: fetchNavItemsDto,
  staleTime: Infinity,
  // El guard de `/app` hace `ensureQueryData` con esto: con el default
  // `networkMode: "online"` y el `connectivityStore` en `offline` la query
  // quedaba pausada y la pantalla en blanco en lugar de llegar al
  // `ErrorPage` ("No pudimos comunicarnos con el servidor" + "Reintentar").
  networkMode: "always",
})

export function useNavItemsQuery() {
  return useQuery({ ...navItemsQueryOptions, select: resolveNavIcons })
}

/**
 * Primera pantalla a la que puede entrar el usuario: la del primer item del
 * sidebar, en el mismo orden en que se pinta. Sirve para resolver `/app`, que
 * no tiene página propia — mandarlo a una ruta fija (antes, Cobertura) dejaba
 * fuera a los roles que no tienen ese menú asignado.
 *
 * Los grupos ya heredan la ruta de su primer hijo en `toNavItemDtos`, así que
 * el `url` del primer item siempre es navegable. `null` si el menú vino vacío.
 */
export function getFirstNavUrl(items: readonly { url: string }[]): string | null {
  return items[0]?.url ?? null
}

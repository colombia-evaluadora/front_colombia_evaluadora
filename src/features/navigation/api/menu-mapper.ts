import type { NavItemDto, RouteResponseDto } from "./types/nav-item"

// El backend devuelve una lista plana ordenada por `menuOrder`, con la
// jerarquía expresada vía `idParent` (null = ítem de primer nivel). La UI
// espera un árbol de un solo nivel: {title,url,icon,items?:{title,url}[]}.
export function toNavItemDtos(routes: RouteResponseDto[]): NavItemDto[] {
  const sorted = [...routes].sort((a, b) => a.menuOrder - b.menuOrder)

  const childrenByParent = new Map<number, RouteResponseDto[]>()
  for (const route of sorted) {
    if (route.idParent === null) continue
    const siblings = childrenByParent.get(route.idParent) ?? []
    siblings.push(route)
    childrenByParent.set(route.idParent, siblings)
  }

  return sorted
    .filter((route) => route.idParent === null)
    .map((route) => {
      const children = childrenByParent.get(route.id)
      return {
        title: route.name,
        url: route.path,
        icon: route.icon,
        ...(children?.length
          ? { items: children.map((c) => ({ title: c.name, url: c.path })) }
          : {}),
      }
    })
}

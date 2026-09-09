import type { NavItemDto, NavMaxLines } from "@/features/navigation/api/types/nav-item"

/**
 * Lo que el mapper necesita de un menú. Lo cumplen tanto `MenuDto` de eval-col
 * (`GET /menus`) como el viejo `RouteResponseDto` de `/sso-admin/myMenu`: lista
 * plana, jerarquía por `idParent` (null = raíz), orden por `menuOrder`.
 */
export interface MenuSource {
  id: number
  name: string
  icon: string | null
  path: string | null
  menuOrder: number
  idParent: number | null
  visible?: boolean
  maxLines?: NavMaxLines
}

/**
 * Aplana el catálogo a lo que pinta el sidebar: un árbol de un solo nivel
 * {title,url,icon,items?:{title,url}[]}.
 *
 * Dos reglas que salen del dato real:
 *
 * - **Un grupo (raíz, `idParent === null`) nunca tiene ruta propia
 *   navegable** — es un contenedor, no una pantalla. Siempre hereda la de su
 *   primer hijo, que es a donde lleva al abrirlo. Se ignora el `path` propio
 *   del grupo aunque el backend lo traiga cargado: visto en real, un valor
 *   suelto ahí (que ni siquiera correspondía a ninguno de sus hijos) mandaba
 *   a una URL que no existe en el front.
 * - **`visible: false` no se pinta.** Es el interruptor que maneja la pantalla
 *   de configuración de roles y menús; un grupo oculto se lleva a sus ítems.
 *
 * Lo que quede sin ruta después de eso (un grupo vacío, un ítem sin url) no se
 * puede navegar, así que no entra al menú.
 */
export function toNavItemDtos(menus: MenuSource[]): NavItemDto[] {
  const visibles = menus.filter((menu) => menu.visible !== false)
  const sorted = [...visibles].sort((a, b) => a.menuOrder - b.menuOrder)

  const childrenByParent = new Map<number, MenuSource[]>()
  for (const menu of sorted) {
    if (menu.idParent === null) continue
    const siblings = childrenByParent.get(menu.idParent) ?? []
    siblings.push(menu)
    childrenByParent.set(menu.idParent, siblings)
  }

  return sorted
    .filter((menu) => menu.idParent === null)
    .map((menu): NavItemDto | null => {
      const children = (childrenByParent.get(menu.id) ?? []).filter((child) => child.path)
      const url = children[0]?.path ?? null
      if (url === null) return null

      return {
        title: menu.name,
        url,
        icon: menu.icon,
        maxLines: menu.maxLines,
        ...(children.length
          ? {
              items: children.map((child) => ({
                title: child.name,
                url: child.path!,
                maxLines: child.maxLines,
              })),
            }
          : {}),
      }
    })
    .filter((item): item is NavItemDto => item !== null)
}

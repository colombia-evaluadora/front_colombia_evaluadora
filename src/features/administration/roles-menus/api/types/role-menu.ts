export interface Role {
  id: number
  name: string
}

/** Plan comercial al que puede quedar atado un menú. */
export interface Plan {
  id: number
  name: string
}

/**
 * Menú tal como lo entrega el SSO: lista plana, jerarquía por `idParent`.
 * Es la misma forma de `RouteResponseDto` (features/navigation) menos
 * `roleIds`: acá la asignación por rol se pide aparte, porque la pantalla
 * edita un rol a la vez.
 */
export interface MenuNode {
  id: number
  name: string
  icon: string
  path: string
  menuOrder: number
  type: string
  idParent: number | null
  /** Si se pinta en el menú lateral. Los menús viejos no lo traen: se asume `true`. */
  visible?: boolean
  planId?: number | null
}

export interface MenuTreeNode extends MenuNode {
  children: MenuNode[]
}

export interface UpdateRoleMenusResult {
  status: "success" | "error"
  message: string
}

/** Arma el árbol de dos niveles (grupo → ítems) que pinta la pantalla. */
export function buildMenuTree(menus: MenuNode[]): MenuTreeNode[] {
  const byOrder = (a: MenuNode, b: MenuNode) => a.menuOrder - b.menuOrder

  return menus
    .filter((menu) => menu.idParent === null)
    .sort(byOrder)
    .map((root) => ({
      ...root,
      children: menus.filter((menu) => menu.idParent === root.id).sort(byOrder),
    }))
}

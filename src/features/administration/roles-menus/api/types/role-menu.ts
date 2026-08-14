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

/** Nuevo `menuOrder` de un menú, tal como se manda al guardar el orden. */
export interface MenuOrderItem {
  id: number
  menuOrder: number
}

/**
 * Mueve `draggedId` a la posición de `targetId` dentro de `siblings` y devuelve
 * el `menuOrder` de cada hermano.
 *
 * `visibleIds` es la lista que el usuario ve —el panel puede estar filtrado por
 * el buscador, o mostrar solo los menús del rol—, así que el movimiento se
 * resuelve entre esos y después se vuelca sobre las posiciones que ese
 * subconjunto ocupaba en la lista completa. Sin eso, arrastrar en una lista
 * filtrada reordenaría también a los hermanos que no están a la vista.
 */
export function reorderSiblings(
  siblings: MenuNode[],
  visibleIds: number[],
  draggedId: number,
  targetId: number,
): MenuOrderItem[] {
  const ordered = [...siblings].sort((a, b) => a.menuOrder - b.menuOrder)

  // Posiciones (en la lista completa) que ocupa lo que se ve: son las ranuras
  // que el movimiento puede reescribir.
  const slots: number[] = []
  const visible: number[] = []
  ordered.forEach((menu, index) => {
    if (visibleIds.includes(menu.id)) {
      slots.push(index)
      visible.push(menu.id)
    }
  })

  const from = visible.indexOf(draggedId)
  const to = visible.indexOf(targetId)
  if (from === -1 || to === -1 || from === to) return []

  visible.splice(to, 0, ...visible.splice(from, 1))

  const next = [...ordered]
  slots.forEach((slot, index) => {
    next[slot] = ordered.find((menu) => menu.id === visible[index])!
  })

  // Solo los que efectivamente cambiaron de lugar.
  return next
    .map((menu, index) => ({ id: menu.id, menuOrder: index }))
    .filter(({ id, menuOrder }) => ordered.find((menu) => menu.id === id)!.menuOrder !== menuOrder)
}

/**
 * Reordena los menús DE UN ROL. Es un orden distinto al del catálogo
 * (`menuOrder`): dice en qué secuencia ve el menú ese rol, y se guarda como el
 * orden de la lista de asignados, no tocando el catálogo.
 *
 * La lista es plana, así que se mueve por bloques: un grupo se lleva a sus
 * ítems, y un ítem se mueve solo dentro de su grupo. Mover un ítem a otro grupo
 * sería cambiarle el padre —eso es editar el menú, no reordenar el rol—.
 */
export function reorderAssignedMenus(
  assignedIds: number[],
  tree: MenuTreeNode[],
  draggedId: number,
  targetId: number,
): number[] {
  const parentOf = new Map<number, number | null>()
  for (const group of tree) {
    parentOf.set(group.id, null)
    for (const child of group.children) parentOf.set(child.id, group.id)
  }

  const draggedParent = parentOf.get(draggedId)
  if (draggedId === targetId || draggedParent === undefined) return assignedIds
  if (draggedParent !== parentOf.get(targetId)) return assignedIds

  const blocks = assignedIds
    .filter((id) => parentOf.get(id) === null)
    .map((groupId) => ({
      groupId,
      childIds: assignedIds.filter((id) => parentOf.get(id) === groupId),
    }))

  if (draggedParent === null) {
    const from = blocks.findIndex((block) => block.groupId === draggedId)
    const to = blocks.findIndex((block) => block.groupId === targetId)
    if (from === -1 || to === -1) return assignedIds
    blocks.splice(to, 0, ...blocks.splice(from, 1))
  } else {
    const block = blocks.find((it) => it.groupId === draggedParent)
    if (!block) return assignedIds
    const from = block.childIds.indexOf(draggedId)
    const to = block.childIds.indexOf(targetId)
    if (from === -1 || to === -1) return assignedIds
    block.childIds.splice(to, 0, ...block.childIds.splice(from, 1))
  }

  const next = blocks.flatMap((block) => [block.groupId, ...block.childIds])
  // Lo que no entró en ningún bloque (un menú asignado que ya no está en el
  // catálogo) se conserva: reordenar no puede perder asignaciones.
  return [...next, ...assignedIds.filter((id) => !next.includes(id))]
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

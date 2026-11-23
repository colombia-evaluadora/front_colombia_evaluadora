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
  /** Los grupos sin ícono cargado llegan en `null` (26 de los 163 del catálogo real). */
  icon: string | null
  /** Un grupo puede no tener ruta propia: agrupa, no navega. */
  path: string | null
  menuOrder: number
  type: string
  idParent: number | null
  /** Si se pinta en el menú lateral. Los menús viejos no lo traen: se asume `true`. */
  visible?: boolean
  planId?: number | null
  /**
   * Módulo fuera de la licencia del cliente (S.3.VRO.1c): se ve en la matriz con su etiqueta y sin
   * permisos. Pendiente de backend: hoy solo lo trae el mock.
   */
  fueraDeLicencia?: boolean
}

/** Tipo de las pestañas con permiso propio (S.3.VRO.1a): cuelgan de un submódulo. */
export const TIPO_PESTANA = "TAB"

export const esPestana = (menu: Pick<MenuNode, "type">) => menu.type === TIPO_PESTANA

/** Submódulo con sus pestañas (vacío si no tiene). */
export interface MenuChildNode extends MenuNode {
  pestanas?: MenuNode[]
}

export interface MenuTreeNode extends MenuNode {
  children: MenuChildNode[]
}

/** Padre de cada menú del árbol (módulo → null; submódulo → módulo; pestaña → submódulo). */
export function parentMap(tree: MenuTreeNode[]): Map<number, number | null> {
  const parentOf = new Map<number, number | null>()
  for (const group of tree) {
    parentOf.set(group.id, null)
    for (const child of group.children) {
      parentOf.set(child.id, group.id)
      for (const tab of child.pestanas ?? []) parentOf.set(tab.id, child.id)
    }
  }
  return parentOf
}

/** Hijos directos de cada menú del árbol. */
export function childrenMap(tree: MenuTreeNode[]): Map<number, number[]> {
  const childrenOf = new Map<number, number[]>()
  for (const group of tree) {
    childrenOf.set(group.id, group.children.map((child) => child.id))
    for (const child of group.children) childrenOf.set(child.id, (child.pestanas ?? []).map((tab) => tab.id))
  }
  return childrenOf
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
 * Completa la lista de asignados con el padre de todo submenú que lo tenga
 * ausente, respetando el orden (el padre entra justo antes de su primer hijo).
 *
 * El backend valida la invariante de jerarquía: `fn_associate_menus_to_rol`
 * aborta la operación entera si `p_pk_tmenus` trae un submenú sin su padre. Y
 * la lista puede llegar rota desde la propia base —la versión anterior de esa
 * función era un UPSERT sin invariante, así que aceptó hijos sueltos—, con lo
 * cual el front hereda el problema apenas vuelve a guardar (reordenar alcanza,
 * porque reenvía el mismo conjunto que recibió).
 *
 * Los ids que no están en el catálogo se dejan como están: no se puede saber si
 * son grupos o submenús, y descartarlos perdería asignaciones en silencio.
 */
/**
 * Separa los asignados en los que el catálogo sabe ubicar y los que no.
 *
 * Un id queda "huérfano" cuando no aparece en el árbol: pasa cuando su menú
 * padre fue dado de baja (`active = false`) y el catálogo ya no lo devuelve, o
 * cuando la jerarquía tiene más de dos niveles y `buildMenuTree` no lo alcanza.
 * Esos ids son fantasmas: la pantalla no los pinta —se dibuja desde el
 * árbol—, así que no se pueden ver ni quitar desde la pantalla, pero viajan en
 * cada guardado y hacen que el backend rechace la operación entera por la
 * invariante de jerarquía.
 *
 * `withRequiredParents` no puede rescatarlos: no hay forma de saber cuál era el
 * padre. Se separan para dejarlos fuera del envío y avisarle a quien guarda, en
 * vez de mandar una lista que el backend va a rechazar.
 */
export function partitionKnownMenus(
  assignedIds: number[],
  tree: MenuTreeNode[],
): { known: number[]; unknown: number[] } {
  const inTree = new Set(parentMap(tree).keys())

  const known: number[] = []
  const unknown: number[] = []
  for (const id of assignedIds) (inTree.has(id) ? known : unknown).push(id)
  return { known, unknown }
}
export function withRequiredParents(assignedIds: number[], tree: MenuTreeNode[]): number[] {
  const parentOf = parentMap(tree)

  const next: number[] = []
  const seen = new Set<number>()
  for (const id of assignedIds) {
    // Ancestros que falten, del más alto al más cercano (una pestaña trae su submódulo y su módulo).
    const ancestors: number[] = []
    for (let p = parentOf.get(id); p != null; p = parentOf.get(p)) ancestors.unshift(p)
    for (const parentId of ancestors) {
      if (seen.has(parentId)) continue
      next.push(parentId)
      seen.add(parentId)
    }
    if (seen.has(id)) continue
    next.push(id)
    seen.add(id)
  }
  return next
}

/**
 * Arma el árbol de dos niveles (grupo → ítems) que pinta la pantalla, más las
 * pestañas con permiso propio de cada ítem (S.3.VRO.1a).
 *
 * Dos niveles NO es una limitación a corregir: es la invariante del backend.
 * `fn_upsert_menu` rechaza explícitamente crear un tercer nivel (ERRCODE
 * `22023`, "el padre pk=% ... no es un menu raiz"), tanto al crear como al
 * reparentar. Volver esto recursivo aceptaría estructuras que el backend no
 * deja construir.
 *
 * Lo que sí existía era data legacy más profunda, anterior a esa restricción
 * (el menú 299 colgado de 267): esos nodos caían acá como "huérfanos". La
 * migración V115 del SSO los desactiva y evita que vuelvan a aparecer —
 * `fn_list_available_menus` ahora solo devuelve menús con la cadena de
 * ancestros activa—. `partitionKnownMenus` los sigue filtrando igual, como red
 * de seguridad.
 *
 * Las pestañas (`type` = `TAB`) son la única excepción: cuelgan de un ítem y
 * no navegan. Pendiente de backend: hoy solo las trae el mock; sin ellas el
 * árbol queda igual que antes.
 */
export function buildMenuTree<T extends MenuNode>(menus: T[]): (T & { children: (T & { pestanas: T[] })[] })[] {
  const byOrder = (a: MenuNode, b: MenuNode) => a.menuOrder - b.menuOrder

  return menus
    .filter((menu) => menu.idParent === null)
    .sort(byOrder)
    .map((root) => ({
      ...root,
      children: menus
        .filter((menu) => menu.idParent === root.id && !esPestana(menu))
        .sort(byOrder)
        .map((child) => ({
          ...child,
          pestanas: menus.filter((menu) => menu.idParent === child.id && esPestana(menu)).sort(byOrder),
        })),
    }))
}

/** Menú del catálogo de la pestaña Módulos y submódulos (GET /menus/catalogo). */
export interface MenuCatalogNode extends MenuNode {
  /** Estado del menú; uno inactivo desaparece de los roles y del menú lateral. */
  activo: boolean
  /** Asignado a algún rol: no se puede eliminar, solo inactivar. */
  enUso: boolean
  /** La vista tiene crear y editar; si no, ningún rol los tiene en ella. */
  admiteGuardar: boolean
  /** La vista tiene eliminar; si no, ningún rol lo tiene en ella. */
  admiteEliminar: boolean
}

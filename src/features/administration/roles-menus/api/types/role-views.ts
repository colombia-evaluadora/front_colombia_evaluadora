import type { MenuTreeNode } from "@/features/administration/roles-menus/api/types/role-menu"

/** Acciones de una vista para un rol (Administración del Sistema, Sección 4.2). */
export interface ViewPermission {
  acceso: boolean
  guardar: boolean
  eliminar: boolean
}

export type ViewAction = keyof ViewPermission

/** Permisos del rol por id de menú. Un menú ausente es "sin acceso". */
export type RoleViews = Map<number, ViewPermission>

const NONE: ViewPermission = { acceso: false, guardar: false, eliminar: false }

export const ACTION_LABELS: Record<ViewAction, string> = {
  acceso: "Acceso",
  guardar: "Guardar",
  eliminar: "Eliminar",
}

export function getPermission(views: RoleViews, id: number): ViewPermission {
  return views.get(id) ?? NONE
}

/**
 * Cambia una acción y mantiene la coherencia:
 *  - Guardar o Eliminar sin Acceso no existen: prenderlos prende Acceso y
 *    apagar Acceso los apaga.
 *  - El Acceso de un módulo se aplica a todos sus submódulos.
 *  - Dar Acceso a un submódulo da Acceso a su módulo (el backend rechaza un
 *    hijo sin su padre).
 */
export function toggleAction(
  views: RoleViews,
  tree: MenuTreeNode[],
  id: number,
  action: ViewAction,
  checked: boolean,
): RoleViews {
  const next = new Map(views)

  function set(menuId: number, patch: Partial<ViewPermission>) {
    const merged = { ...getPermission(next, menuId), ...patch }
    if (patch.guardar || patch.eliminar) merged.acceso = true
    if (!merged.acceso) merged.guardar = merged.eliminar = false
    if (merged.acceso) next.set(menuId, merged)
    else next.delete(menuId)
  }

  set(id, { [action]: checked })

  const group = tree.find((node) => node.id === id)
  if (group && action === "acceso") {
    group.children.forEach((child) => set(child.id, { acceso: checked }))
  }

  const parent = tree.find((node) => node.children.some((child) => child.id === id))
  if (parent && getPermission(next, id).acceso) set(parent.id, { acceso: true })

  return next
}

export interface PermissionChange {
  id: number
  action: ViewAction
  checked: boolean
}

/** Diferencias entre lo guardado y el borrador, una por acción. */
export function diffViews(saved: RoleViews, draft: RoleViews): PermissionChange[] {
  const ids = new Set([...saved.keys(), ...draft.keys()])
  const changes: PermissionChange[] = []
  for (const id of ids) {
    const before = getPermission(saved, id)
    const after = getPermission(draft, id)
    for (const action of Object.keys(ACTION_LABELS) as ViewAction[]) {
      if (before[action] !== after[action]) changes.push({ id, action, checked: after[action] })
    }
  }
  return changes
}

/**
 * Lo que el SSO guarda hoy: un solo indicador `soloLectura` por menú
 * (TROL_MENU.SOLO_LECTURA). Guardar y Eliminar viajan aparte para cuando el
 * backend los separe; mientras tanto, cualquiera de los dos quita el solo
 * lectura y el SSO concede los dos.
 */
export function toPayload(views: RoleViews) {
  return [...views.entries()].map(([id, permission]) => ({
    id,
    soloLectura: !permission.guardar && !permission.eliminar,
    guardar: permission.guardar,
    eliminar: permission.eliminar,
  }))
}

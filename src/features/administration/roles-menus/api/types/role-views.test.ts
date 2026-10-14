import { describe, expect, it } from "vitest"

import type { MenuTreeNode } from "@/features/administration/roles-menus/api/types/role-menu"
import {
  diffViews,
  getPermission,
  toggleAction,
  toPayload,
} from "@/features/administration/roles-menus/api/types/role-views"
import type { RoleViews } from "@/features/administration/roles-menus/api/types/role-views"

function node(id: number, idParent: number | null = null) {
  return { id, name: `Menú ${id}`, icon: null, path: null, menuOrder: id, type: "MENU", idParent }
}

// Módulo 1 con submódulos 2 y 3.
const tree: MenuTreeNode[] = [{ ...node(1), children: [node(2, 1), node(3, 1)] }]
const empty: RoleViews = new Map()

describe("toggleAction", () => {
  it("el acceso del módulo se aplica a sus submódulos", () => {
    const next = toggleAction(empty, tree, 1, "acceso", true)
    expect([...next.keys()].sort()).toEqual([1, 2, 3])
  })

  it("dar acceso a un submódulo da acceso a su módulo", () => {
    const next = toggleAction(empty, tree, 2, "acceso", true)
    expect(getPermission(next, 1).acceso).toBe(true)
    expect(getPermission(next, 3).acceso).toBe(false)
  })

  it("prender Guardar prende Acceso", () => {
    const next = toggleAction(empty, tree, 2, "guardar", true)
    expect(getPermission(next, 2)).toEqual({ acceso: true, guardar: true, eliminar: false })
  })

  it("quitar Acceso apaga Guardar y Eliminar", () => {
    const withAll = toggleAction(toggleAction(empty, tree, 2, "guardar", true), tree, 2, "eliminar", true)
    const next = toggleAction(withAll, tree, 2, "acceso", false)
    expect(next.has(2)).toBe(false)
  })
})

describe("diffViews", () => {
  it("lista cada acción que cambió", () => {
    const draft = toggleAction(empty, tree, 2, "guardar", true)
    expect(diffViews(empty, draft)).toEqual([
      { id: 2, action: "acceso", checked: true },
      { id: 2, action: "guardar", checked: true },
      { id: 1, action: "acceso", checked: true },
    ])
  })
})

describe("toPayload", () => {
  it("solo lectura cuando no hay Guardar ni Eliminar", () => {
    const views: RoleViews = new Map([
      [1, { acceso: true, guardar: false, eliminar: false }],
      [2, { acceso: true, guardar: false, eliminar: true }],
    ])
    expect(toPayload(views)).toEqual([
      { id: 1, soloLectura: true, guardar: false, eliminar: false },
      { id: 2, soloLectura: false, guardar: false, eliminar: true },
    ])
  })
})

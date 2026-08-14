import { http, HttpResponse, delay } from "msw"

import type {
  MenuNode,
  Role,
  UpdateRoleMenusResult,
} from "@/features/administration/roles-menus/api/types/role-menu"

import { navigationMenu } from "@/mocks/db/navigation"
import { rolesDb } from "@/mocks/db/roles"

function toMenuNode({ roleIds: _roleIds, ...menu }: (typeof navigationMenu)[number]): MenuNode {
  return menu
}

/** Orden del menú de cada rol: la lista de ids tal como se guardó. */
const roleMenuOrder = new Map<number, number[]>()

export const rolesHandlers = [
  http.get("/api/roles", async () => {
    await delay(150)
    return HttpResponse.json<Role[]>(rolesDb)
  }),

  // Alta rápida desde el propio select de la pantalla de configuración.
  http.post("/api/roles", async ({ request }) => {
    await delay(200)
    const { name } = (await request.json()) as { name: string }
    const trimmed = name.trim()

    if (!trimmed) {
      return HttpResponse.json({ message: "El nombre del rol es obligatorio." }, { status: 400 })
    }
    if (rolesDb.some((role) => role.name.toLowerCase() === trimmed.toLowerCase())) {
      return HttpResponse.json({ message: "Ya existe un rol con ese nombre." }, { status: 409 })
    }

    const role: Role = {
      id: Math.max(0, ...rolesDb.map((it) => it.id)) + 1,
      name: trimmed,
    }
    rolesDb.push(role)
    return HttpResponse.json<Role>(role, { status: 201 })
  }),

  // Catálogo completo de menús: el de la pantalla de configuración, a
  // diferencia de `/sso-admin/myMenu`, que ya viene filtrado por rol.
  http.get("/api/menus", async () => {
    await delay(150)
    return HttpResponse.json<MenuNode[]>(navigationMenu.map(toMenuNode))
  }),

  http.post("/api/menus", async ({ request }) => {
    await delay(200)
    const values = (await request.json()) as {
      name: string
      path: string
      icon: string
      idParent: number | null
      visible?: boolean
      planId?: number | null
    }
    const siblings = navigationMenu.filter((menu) => menu.idParent === values.idParent)
    const menu = {
      id: Math.max(0, ...navigationMenu.map((it) => it.id)) + 1,
      name: values.name.trim(),
      icon: values.icon.trim(),
      path: values.path.trim(),
      menuOrder: siblings.length,
      type: values.idParent === null ? "GROUP" : "ITEM",
      idParent: values.idParent,
      visible: values.visible ?? true,
      planId: values.planId ?? null,
      roleIds: [] as number[],
    }
    navigationMenu.push(menu)
    return HttpResponse.json<MenuNode>(toMenuNode(menu), { status: 201 })
  }),

  // Reordenamiento (arrastrar y soltar): llega el nuevo `menuOrder` de todos
  // los menús que se corrieron de lugar.
  http.put("/api/menus/order", async ({ request }) => {
    await delay(200)
    const { items } = (await request.json()) as { items: { id: number; menuOrder: number }[] }

    for (const item of items) {
      const menu = navigationMenu.find((it) => it.id === item.id)
      if (!menu) {
        return HttpResponse.json({ message: "El menú no existe." }, { status: 404 })
      }
      menu.menuOrder = item.menuOrder
    }

    return new HttpResponse(null, { status: 204 })
  }),

  http.patch("/api/menus/:menuId", async ({ params, request }) => {
    await delay(200)
    const menu = navigationMenu.find((it) => it.id === Number(params.menuId))
    if (!menu) {
      return HttpResponse.json({ message: "El menú no existe." }, { status: 404 })
    }
    const values = (await request.json()) as {
      name: string
      path: string
      icon: string
      idParent: number | null
      visible?: boolean
      planId?: number | null
    }
    menu.name = values.name.trim()
    menu.path = values.path.trim()
    menu.icon = values.icon.trim()
    menu.idParent = values.idParent
    menu.type = values.idParent === null ? "GROUP" : "ITEM"
    if (values.visible !== undefined) menu.visible = values.visible
    if (values.planId !== undefined) menu.planId = values.planId
    return HttpResponse.json<MenuNode>(toMenuNode(menu))
  }),

  http.delete("/api/menus/:menuId", async ({ params }) => {
    await delay(200)
    const menuId = Number(params.menuId)
    const index = navigationMenu.findIndex((menu) => menu.id === menuId)
    if (index === -1) {
      return HttpResponse.json<UpdateRoleMenusResult>(
        { status: "error", message: "El menú no existe." },
        { status: 404 },
      )
    }
    // Un grupo se lleva sus hijos: no pueden quedar colgados de un padre que
    // ya no existe.
    const doomed = new Set([menuId])
    for (const menu of navigationMenu) {
      if (menu.idParent === menuId) doomed.add(menu.id)
    }
    for (const id of doomed) {
      navigationMenu.splice(
        navigationMenu.findIndex((menu) => menu.id === id),
        1,
      )
    }
    return HttpResponse.json<UpdateRoleMenusResult>({
      status: "success",
      message: "Menú eliminado.",
    })
  }),

  // El orden de esta lista ES el orden en que el rol ve su menú, distinto del
  // `menuOrder` del catálogo. Se guarda aparte para no perderlo al releer.
  http.get("/api/roles/:roleId/menus", async ({ params }) => {
    await delay(150)
    const roleId = Number(params.roleId)
    const assigned = navigationMenu
      .filter((menu) => menu.roleIds.includes(roleId))
      .map((menu) => menu.id)

    const saved = roleMenuOrder.get(roleId)
    if (!saved) return HttpResponse.json<number[]>(assigned)

    // Lo guardado manda; lo que se asignó por otra vía va al final.
    return HttpResponse.json<number[]>([
      ...saved.filter((id) => assigned.includes(id)),
      ...assigned.filter((id) => !saved.includes(id)),
    ])
  }),

  http.put("/api/roles/:roleId/menus", async ({ params, request }) => {
    await delay(200)
    const roleId = Number(params.roleId)
    const { menuIds } = (await request.json()) as { menuIds: number[] }

    if (!rolesDb.some((role) => role.id === roleId)) {
      return HttpResponse.json<UpdateRoleMenusResult>(
        { status: "error", message: "El rol no existe." },
        { status: 404 },
      )
    }

    // La asignación vive en cada menú (`roleIds`), así que se reescribe la
    // pertenencia de este rol en todo el catálogo.
    for (const menu of navigationMenu) {
      const shouldHave = menuIds.includes(menu.id)
      const hasIt = menu.roleIds.includes(roleId)
      if (shouldHave && !hasIt) menu.roleIds.push(roleId)
      if (!shouldHave && hasIt) {
        menu.roleIds = menu.roleIds.filter((id) => id !== roleId)
      }
    }

    roleMenuOrder.set(roleId, menuIds)

    return HttpResponse.json<UpdateRoleMenusResult>({
      status: "success",
      message: "Menús actualizados.",
    })
  }),
]

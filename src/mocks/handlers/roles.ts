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

/**
 * El gateway envuelve TODA respuesta de path-dispatch en `{rows, outParams}`,
 * incluso las de una sola fila y las de una sola columna. Los mocks copian ese
 * sobre para que el cliente (`lib/eval-col-client`) se ejercite igual en los
 * dos modos.
 */
function rows<T>(data: T[], init?: ResponseInit) {
  return HttpResponse.json({ rows: data, outParams: {} }, init)
}

/** Orden del menú de cada rol: la lista de ids tal como se guardó. */
const roleMenuOrder = new Map<number, number[]>()

export const rolesHandlers = [
  http.get("/api/eval-col/roles", async () => {
    await delay(150)
    return rows<Role>(rolesDb)
  }),

  // Alta rápida desde el propio select de la pantalla de configuración.
  http.post("/api/eval-col/roles", async ({ request }) => {
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
    return rows<Role>([role], { status: 201 })
  }),

  // Catálogo completo de menús: el de la pantalla de configuración, a
  // diferencia de `/sso-admin/myMenu`, que ya viene filtrado por rol.
  http.get("/api/eval-col/menus", async () => {
    await delay(150)
    return rows<MenuNode>(navigationMenu.map(toMenuNode))
  }),

  http.post("/api/eval-col/menus", async ({ request }) => {
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
    return rows<MenuNode>([toMenuNode(menu)], { status: 201 })
  }),

  // Reordenamiento (arrastrar y soltar): llega el nuevo `menuOrder` de todos
  // los menús que se corrieron de lugar.
  http.put("/api/eval-col/menus/order", async ({ request }) => {
    await delay(200)
    const { items } = (await request.json()) as { items: { id: number; menuOrder: number }[] }

    for (const item of items) {
      const menu = navigationMenu.find((it) => it.id === item.id)
      if (!menu) {
        return HttpResponse.json({ message: "El menú no existe." }, { status: 404 })
      }
      menu.menuOrder = item.menuOrder
    }

    return rows<UpdateRoleMenusResult>([{ status: "success", message: "Orden actualizado." }])
  }),

  http.patch("/api/eval-col/menus/:menuId", async ({ params, request }) => {
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
    return rows<MenuNode>([toMenuNode(menu)])
  }),

  // Baja lógica: el backend la expone como PUT /menus/{id}/eliminar, no como
  // DELETE. Un id que no existe es 404, no un `status: "error"` con 200.
  http.put("/api/eval-col/menus/:menuId/eliminar", async ({ params }) => {
    await delay(200)
    const menuId = Number(params.menuId)
    const index = navigationMenu.findIndex((menu) => menu.id === menuId)
    if (index === -1) {
      return HttpResponse.json(
        { message: `fn_delete_menu: no existe el menu con pk=${menuId}` },
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
    return rows<UpdateRoleMenusResult>([{ status: "success", message: "Menu eliminado" }])
  }),

  // El orden de esta lista ES el orden en que el rol ve su menú, distinto del
  // `menuOrder` del catálogo. Se guarda aparte para no perderlo al releer.
  // Cada fila llega como `{id}`: una columna sola no colapsa a escalar.
  http.get("/api/eval-col/roles/:roleId/menus", async ({ params }) => {
    await delay(150)
    const roleId = Number(params.roleId)
    const assigned = navigationMenu
      .filter((menu) => menu.roleIds.includes(roleId))
      .map((menu) => menu.id)

    const saved = roleMenuOrder.get(roleId)
    const ids = !saved
      ? assigned
      : // Lo guardado manda; lo que se asignó por otra vía va al final.
        [
          ...saved.filter((id) => assigned.includes(id)),
          ...assigned.filter((id) => !saved.includes(id)),
        ]

    return rows(ids.map((id) => ({ id })))
  }),

  http.put("/api/eval-col/roles/:roleId/menus", async ({ params, request }) => {
    await delay(200)
    const roleId = Number(params.roleId)
    const { menuIds } = (await request.json()) as { menuIds: number[] }

    if (!rolesDb.some((role) => role.id === roleId)) {
      return HttpResponse.json(
        { message: `fn_associate_menus_to_rol: no existe el rol con pk=${roleId}` },
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

    return rows<UpdateRoleMenusResult>([
      { status: "success", message: "Menús actualizados." },
    ])
  }),
]

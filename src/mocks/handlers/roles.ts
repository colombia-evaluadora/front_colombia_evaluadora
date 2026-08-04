import { http, HttpResponse, delay } from "msw"

import type {
  MenuNode,
  Role,
  UpdateRoleMenusResult,
} from "@/features/administration/roles-menus/api/types/role-menu"

import { navigationMenu } from "../db/navigation"
import { rolesDb } from "../db/roles"

function toMenuNode({ roleIds: _roleIds, ...menu }: (typeof navigationMenu)[number]): MenuNode {
  return menu
}

export const rolesHandlers = [
  http.get("/api/roles", async () => {
    await delay(150)
    return HttpResponse.json<Role[]>(rolesDb)
  }),

  // Catálogo completo de menús: el de la pantalla de configuración, a
  // diferencia de `/sso-admin/myMenu`, que ya viene filtrado por rol.
  http.get("/api/menus", async () => {
    await delay(150)
    return HttpResponse.json<MenuNode[]>(navigationMenu.map(toMenuNode))
  }),

  http.get("/api/roles/:roleId/menus", async ({ params }) => {
    await delay(150)
    const roleId = Number(params.roleId)
    const assigned = navigationMenu
      .filter((menu) => menu.roleIds.includes(roleId))
      .map((menu) => menu.id)
    return HttpResponse.json<number[]>(assigned)
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

    return HttpResponse.json<UpdateRoleMenusResult>({
      status: "success",
      message: "Menús actualizados.",
    })
  }),
]

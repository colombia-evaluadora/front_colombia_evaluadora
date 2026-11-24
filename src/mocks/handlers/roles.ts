import { http, HttpResponse, delay } from "msw"

import type {
  MenuNode,
  Role,
  UpdateRoleMenusResult,
} from "@/features/administration/roles-menus/api/types/role-menu"
import type { MenuPermission } from "@/features/navigation/api/types/menu-permission"

import { findUserByToken } from "@/mocks/db/auth"
import { puedeCrearComunicadosMock } from "@/mocks/db/comunicaciones-seleccion"
import { navigationMenu, type MockMenu } from "@/mocks/db/navigation"
import { rolesDb } from "@/mocks/db/roles"

/**
 * El rol del token (`ADMIN`/`USER`) contra el catálogo de roles de `rolesDb`.
 * En el backend real el puente es `public.role.name = 'CEVAL-' || trol.codigo`;
 * acá alcanza con un mapa, pero cumple la misma función: llevar el rol que
 * viaja en el JWT hasta la fila que tiene los menús asignados.
 */
const ROLE_ID_BY_TOKEN_ROLE: Record<string, number> = {
  ADMIN: 1, // Administrador
  USER: 3, // Docente
}

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
const roleMenuReadOnly = new Map<number, Set<number>>()

// ── Vistas por rol (S.3.VRO / S.3.CAT) ────────────────────────────────────────
// Guardar y Eliminar por separado, bloqueos de los roles territoriales, estado y
// acciones que admite cada vista: el SSO real todavía no los tiene (hoy guarda
// un solo `soloLectura`). Viven acá para que la pantalla se pruebe entera.

type Acciones = { guardar: boolean; eliminar: boolean }
type Bloqueos = { guardar?: boolean; eliminar?: boolean }

/** Guardar y Eliminar de cada vista, por rol. Sin entrada: salen de `soloLectura`. */
const roleMenuActions = new Map<number, Map<number, Acciones>>()
/** Acciones que el rol no puede tener en la vista (roles territoriales). */
const roleMenuLocks = new Map<number, Map<number, Bloqueos>>()
/** Estado de cada vista en el catálogo (Módulos y submódulos). Sin entrada: activa. */
const menuActivo = new Map<number, boolean>()
/** Acciones que admite cada vista además del Acceso. Sin entrada: las dos. */
const menuAdmite = new Map<number, Acciones>()

// La Bitácora y el Registro de actividad solo se consultan (S.3.VRO.1b).
for (const id of [10, 80, 81, 82, 83, 84, 85, 86, 87, 88]) menuAdmite.set(id, { guardar: false, eliminar: false })
// Vistas que se guardan pero no tienen nada que eliminar.
for (const id of [14, 16, 26, 39, 45, 51, 53, 61, 62, 63, 71, 92, 93]) {
  menuAdmite.set(id, { guardar: true, eliminar: false })
}

const plansDb: { id: number; name: string }[] = [
  { id: 1, name: "Básico" },
  { id: 2, name: "Completo" },
]

/** Funcionarios activos con cada rol, para el aviso de quitar permisos (S.3.VRO.2). */
const FUNCIONARIOS_POR_ROL: Record<number, number> = { 1: 3, 2: 18, 3: 640, 4: 12, 5: 412, 6: 37, 7: 9, 8: 6 }

/** A = solo Acceso, G = Acceso y Guardar, GE = las tres. `lock` bloquea acciones para el rol. */
type Semilla = [menuId: number, acciones: "A" | "G" | "GE", lock?: "G" | "E" | "GE"]

function sembrar(roleId: number, semillas: Semilla[], soloBloqueos: [number, "G" | "E" | "GE"][] = []) {
  const acciones = new Map<number, Acciones>()
  const bloqueos = new Map<number, Bloqueos>()
  const bloquear = (id: number, lock: "G" | "E" | "GE") =>
    bloqueos.set(id, { ...(lock.includes("G") ? { guardar: true } : {}), ...(lock.includes("E") ? { eliminar: true } : {}) })
  for (const [id, a, lock] of semillas) {
    const menu = navigationMenu.find((it) => it.id === id)
    if (!menu) continue
    if (!menu.roleIds.includes(roleId)) menu.roleIds.push(roleId)
    const admite = menuAdmite.get(id) ?? { guardar: true, eliminar: true }
    acciones.set(id, {
      guardar: a !== "A" && admite.guardar && !lock?.includes("G"),
      eliminar: a === "GE" && admite.eliminar && !lock?.includes("E"),
    })
    if (lock) bloquear(id, lock)
  }
  for (const [id, lock] of soloBloqueos) bloquear(id, lock)
  roleMenuActions.set(roleId, acciones)
  roleMenuLocks.set(roleId, bloqueos)
}

const hijosDe = (padre: number): number[] =>
  navigationMenu.filter((it) => it.idParent === padre).map((it) => it.id)
const soloAcceso = (...modulos: number[]): Semilla[] =>
  modulos.flatMap((id) => [[id, "A"], ...hijosDe(id).map((h): Semilla => [h, "A"])] as Semilla[])

// Cobertura educativa de los roles territoriales (S.3.VRO.3 y 4): casi todo en consulta.
const COBERTURA_TERRITORIAL: Semilla[] = [
  [12, "A"],
  [16, "A", "G"],
  [70, "A", "GE"],
  [13, "G", "E"],
  [90, "G", "E"],
  [91, "A", "GE"],
  [92, "A", "G"],
  [93, "G"],
  [14, "A", "G"],
  [71, "A", "G"],
]

// S.3.VRO.1: Responsable de enseñanza.
sembrar(5, [
  [23, "A"],
  [40, "A"],
  [24, "GE"],
  [26, "G"],
  [60, "A"],
  [61, "G"],
  [62, "A"],
])
// S.3.VRO.1a/1b: Gestor administrativo, con pestañas propias y la Bitácora sin Evaluación del
// desempeño ni Administración del sistema.
sembrar(6, [
  [12, "A"],
  [16, "G"],
  [13, "GE"],
  [90, "GE"],
  [91, "GE"],
  [92, "G"],
  [14, "G"],
  [70, "G"],
  [71, "G"],
  [80, "A"],
  [81, "A"],
  [82, "A"],
  [83, "A"],
  [84, "A"],
  [85, "A"],
  [88, "A"],
])
// S.3.VRO.3: Supervisor territorial.
sembrar(7, [
  [17, "A"],
  [19, "G"],
  [20, "A", "GE"],
  [21, "A", "GE"],
  [22, "A", "GE"],
  ...COBERTURA_TERRITORIAL,
  ...soloAcceso(23, 60, 41, 80),
])
// S.3.VRO.4: Administrador territorial; en Administración del sistema solo lo suyo.
sembrar(
  8,
  [
    ...soloAcceso(17),
    ...COBERTURA_TERRITORIAL,
    ...soloAcceso(23, 60, 41, 80),
    [9, "A"],
    [45, "G"],
    [53, "G"],
    [51, "G"],
  ],
  [10, 18, 47, 44, 46, 52, 48, 49, 50].map((id): [number, "GE"] => [id, "GE"]),
)

const catalogNode = (menu: MockMenu) => {
  const admite = menuAdmite.get(menu.id) ?? { guardar: true, eliminar: true }
  return {
    ...toMenuNode(menu),
    activo: menuActivo.get(menu.id) ?? true,
    enUso: menu.roleIds.length > 0,
    admiteGuardar: admite.guardar,
    admiteEliminar: admite.eliminar,
  }
}

// Códigos confirmados contra `{{baseUrl}}/eval-col/usuarios/permisos-menu`
// real; el resto del catálogo mock no los tiene todavía, así que se derivan
// del nombre solo para que el mock tenga algo consistente que devolver.
const MENU_CODIGO_BY_ID: Record<number, string> = {
  // Pestañas de Inscripciones: código propio para no chocar con otros menús.
  18: "CONFIG_ROLES_MENUS",
  90: "INSCRIPCION_RESERVAS_CUPO",
  91: "INSCRIPCION_INSCRIPCIONES",
  92: "INSCRIPCION_CONFIGURACION",
  93: "INSCRIPCION_ENTIDAD_TERRITORIAL",
  21: "FUNCIONARIOS",
  13: "INSCRIPCIONES",
  16: "MATRICULA",
  22: "PERIODOS_ACADEMICOS",
  19: "ESTABLECIMIENTO",
  20: "SEDES_EDUCATIVAS",
  45: "PARAMETROS_EDAD",
  53: "RELACIONES_ALUMNO_GRUPO",
  49: "LISTAS_VALOR",
  26: "ASISTENCIAS",
  50: "CONSERVACION_DATOS",
  61: "CITACIONES_COMPROMISOS",
  62: "RECONOCIMIENTOS",
  71: "PROMOCION_NIVELACION",
  72: "ACTUALIZACION_DATOS",
}

function menuCodigo(menu: MockMenu): string {
  return (
    MENU_CODIGO_BY_ID[menu.id] ??
    menu.name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
  )
}

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

  // Los inactivos no salen: desaparecen de los roles y del menú lateral.
  http.get("/api/eval-col/menus", async () => {
    await delay(150)
    return rows<MenuNode>(navigationMenu.filter((menu) => menuActivo.get(menu.id) !== false).map(toMenuNode))
  }),

  // Catálogo de Módulos y submódulos: también los inactivos.
  http.get("/api/eval-col/menus/catalogo", async () => {
    await delay(150)
    return rows(navigationMenu.map(catalogNode))
  }),

  http.put("/api/eval-col/menus/:menuId/acciones", async ({ params, request }) => {
    await delay(150)
    const id = Number(params.menuId)
    if (!navigationMenu.some((menu) => menu.id === id)) {
      return HttpResponse.json({ message: "El menú no existe." }, { status: 404 })
    }
    const { guardar, eliminar } = (await request.json()) as Acciones
    menuAdmite.set(id, { guardar, eliminar })
    return rows<UpdateRoleMenusResult>([{ status: "success", message: "Acciones actualizadas." }])
  }),

  // Inactivar un módulo inactiva también sus submódulos y pestañas.
  http.put("/api/eval-col/menus/:menuId/estado", async ({ params, request }) => {
    await delay(150)
    const id = Number(params.menuId)
    if (!navigationMenu.some((menu) => menu.id === id)) {
      return HttpResponse.json({ message: "El menú no existe." }, { status: 404 })
    }
    const { activo } = (await request.json()) as { activo: boolean }
    const rama = [id]
    for (let i = 0; i < rama.length; i++) rama.push(...hijosDe(rama[i]))
    for (const menuId of activo ? [id] : rama) menuActivo.set(menuId, activo)
    return rows<UpdateRoleMenusResult>([
      { status: "success", message: activo ? "Menú activado." : "Menú inactivado." },
    ])
  }),

  http.get("/api/eval-col/plans", async () => {
    await delay(100)
    return rows(plansDb)
  }),

  http.post("/api/eval-col/plans", async ({ request }) => {
    await delay(150)
    const { name } = (await request.json()) as { name: string }
    const plan = { id: Math.max(0, ...plansDb.map((it) => it.id)) + 1, name: name.trim() }
    plansDb.push(plan)
    return rows([plan], { status: 201 })
  }),

  http.get("/api/eval-col/roles/:roleId/funcionarios/total", async ({ params }) => {
    await delay(100)
    return rows([{ total: FUNCIONARIOS_POR_ROL[Number(params.roleId)] ?? 0 }])
  }),

  http.get("/api/eval-col/my-menus", async ({ request }) => {
    await delay(150)

    const token = request.headers.get("Authorization")?.replace(/^Bearer /i, "") ?? ""
    const user = findUserByToken(token)
    const roleId = user ? ROLE_ID_BY_TOKEN_ROLE[user.role] : undefined

    if (roleId === undefined) {
      return HttpResponse.json(
        { message: "fn_list_my_menus: no hay usuario autenticado en el token" },
        { status: 403 },
      )
    }

    const ids = new Set<number>()
    for (const menu of navigationMenu) {
      if (!menu.roleIds.includes(roleId)) continue
      ids.add(menu.id)
      if (menu.idParent !== null) ids.add(menu.idParent)
    }

    const roleOrder = roleMenuOrder.get(roleId)
    return rows<MenuNode>(
      navigationMenu
        .filter((menu) => ids.has(menu.id))
        .map((menu) => {
          const position = roleOrder?.indexOf(menu.id) ?? -1
          return {
            ...toMenuNode(menu),
            menuOrder: position === -1 ? menu.menuOrder : position,
          }
        }),
    )
  }),

  http.get("/api/eval-col/usuarios/permisos-menu", async ({ request }) => {
    await delay(150)

    const token = request.headers.get("Authorization")?.replace(/^Bearer /i, "") ?? ""
    const user = findUserByToken(token)
    const roleId = user ? ROLE_ID_BY_TOKEN_ROLE[user.role] : undefined

    if (roleId === undefined) {
      return HttpResponse.json(
        { message: "fn_list_menu_permisos: no hay usuario autenticado en el token" },
        { status: 403 },
      )
    }

    const permisos: MenuPermission[] = navigationMenu
      .filter((menu) => menu.roleIds.includes(roleId) && menu.path)
      .map((menu) => ({
        pk_tmenu: menu.id,
        codigo: menuCodigo(menu),
        nombre: menu.name,
        path: menu.path!,
        puede_crear: true,
        puede_editar: true,
        puede_eliminar: true,
        puede_ver: true,
      }))

    // Menú sin pantalla del asistente (SSO #696): todos los roles mock lo
    // tienen, igual que en el sembrado del backend.
    permisos.push({
      pk_tmenu: 9001,
      codigo: "ASISTENTE",
      nombre: "Asistente",
      path: "",
      puede_crear: true,
      puede_editar: true,
      puede_eliminar: false,
      puede_ver: true,
    })

    // Submenú oculto COMUNICADOS (SSO V562): crear comunicados es un permiso por rol. Lo traen los
    // roles que ya publicaban; un test puede dárselo al Docente (`rolesConComunicados`).
    if (user && puedeCrearComunicadosMock(user.roles)) {
      permisos.push({
        pk_tmenu: 9002,
        codigo: "COMUNICADOS",
        nombre: "Crear comunicados",
        path: "/app/comunicaciones/chat",
        puede_crear: true,
        puede_editar: true,
        puede_eliminar: true,
        puede_ver: true,
      })
    }

    // El Coordinador recibe el Planeador con todos los permisos, igual que en
    // testv2 (`permisos-menu` le da editar). Aun así lo ve en solo lectura:
    // lo decide el rol, ver `usePlaneadorSoloLectura`.
    if (user?.roles.includes("CEVAL-COORDINADOR")) {
      const planeador = navigationMenu.find((menu) => menuCodigo(menu) === "PLANEADOR" && menu.path)
      if (planeador) {
        const resto = permisos.filter((permiso) => permiso.codigo !== "PLANEADOR")
        return rows<MenuPermission>([
          ...resto,
          {
            pk_tmenu: planeador.id,
            codigo: "PLANEADOR",
            nombre: planeador.name,
            path: planeador.path!,
            puede_crear: true,
            puede_editar: true,
            puede_eliminar: true,
            puede_ver: true,
          },
        ])
      }
    }

    return rows<MenuPermission>(permisos)
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
      activo?: boolean
    }
    const siblings = navigationMenu.filter((menu) => menu.idParent === values.idParent)
    const parent = navigationMenu.find((it) => it.id === values.idParent)
    const menu = {
      id: Math.max(0, ...navigationMenu.map((it) => it.id)) + 1,
      name: values.name.trim(),
      icon: values.icon.trim(),
      path: values.path.trim(),
      menuOrder: siblings.length,
      // Colgando de un submódulo es una pestaña (S.3.VRO.1a): no se pinta en el menú lateral.
      type: values.idParent === null ? "GROUP" : parent?.idParent != null ? "TAB" : "ITEM",
      idParent: values.idParent,
      visible: parent?.idParent != null ? false : (values.visible ?? true),
      planId: values.planId ?? null,
      roleIds: [] as number[],
    }
    navigationMenu.push(menu)
    if (values.activo === false) menuActivo.set(menu.id, false)
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
    const parent = navigationMenu.find((it) => it.id === values.idParent)
    menu.type = values.idParent === null ? "GROUP" : parent?.idParent != null ? "TAB" : "ITEM"
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
  // `menuOrder` del catálogo. Se guarda aparte para no perderlo al releer,
  // junto con el flag `soloLectura` de cada menú.
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

    const readOnly = roleMenuReadOnly.get(roleId)
    const actions = roleMenuActions.get(roleId)
    const locks = roleMenuLocks.get(roleId)
    const assignedRows = ids.map((id) => {
      const soloLectura = readOnly?.has(id) ?? false
      const a = actions?.get(id)
      const bloqueos = locks?.get(id)
      return {
        id,
        soloLectura: a ? !a.guardar && !a.eliminar : soloLectura,
        guardar: a?.guardar ?? !soloLectura,
        eliminar: a?.eliminar ?? !soloLectura,
        ...(bloqueos ? { bloqueos } : {}),
      }
    })
    // Vistas que el rol no tiene pero con acciones bloqueadas: viajan para pintar el candado.
    const lockedRows = [...(locks?.entries() ?? [])]
      .filter(([id]) => !ids.includes(id))
      .map(([id, bloqueos]) => ({ id, acceso: false, bloqueos }))
    return rows([...assignedRows, ...lockedRows])
  }),

  http.put("/api/eval-col/roles/:roleId/menus", async ({ params, request }) => {
    await delay(200)
    const roleId = Number(params.roleId)
    const { menus } = (await request.json()) as {
      menus: { id: number; soloLectura?: boolean; guardar?: boolean; eliminar?: boolean }[]
    }
    const menuIds = menus.map((menu) => menu.id)

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
    roleMenuReadOnly.set(
      roleId,
      new Set(menus.filter((menu) => menu.soloLectura).map((menu) => menu.id)),
    )
    // Lo bloqueado para el rol no se concede aunque llegue en el pedido.
    const locks = roleMenuLocks.get(roleId)
    roleMenuActions.set(
      roleId,
      new Map(
        menus.map((menu) => {
          const lock = locks?.get(menu.id)
          const guardar = menu.guardar ?? !menu.soloLectura
          const eliminar = menu.eliminar ?? !menu.soloLectura
          return [menu.id, { guardar: guardar && !lock?.guardar, eliminar: eliminar && !lock?.eliminar }]
        }),
      ),
    )

    return rows<UpdateRoleMenusResult>([
      { status: "success", message: "Menús actualizados." },
    ])
  }),
]

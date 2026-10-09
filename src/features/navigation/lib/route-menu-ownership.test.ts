import { describe, expect, it } from "vitest"

import { router } from "@/router"
import { canAccessPath } from "@/features/navigation/lib/route-access"

/**
 * Recorre TODAS las rutas hoja de `/app` del router real y verifica que cada
 * una la abra solo el ítem de menú que es su dueño. Si se agrega una ruta y
 * no se decide a qué menú pertenece, este test falla (y el guard de `/app` la
 * bloquearía para todos: falla cerrado).
 *
 * Las URLs de menú son las que siembra el backend (`academico_test.tmenu`,
 * migraciones V195/V207/V331 del SSO) y las del mock (`mocks/db/navigation.ts`):
 * coinciden entre sí y con las rutas del front.
 */
const MENU = {
  inscritos: "/app/cobertura/inscritos",
  preMatricula: "/app/cobertura/pre-matricula",
  matricula: "/app/cobertura/matricula",
  registroActividad: "/app/registro-de-actividad/sesiones",
  rolesMenus: "/app/administracion/roles-menus",
  establecimiento: "/app/establecimiento-educativo/general",
  sedes: "/app/establecimiento-educativo/sedes",
  funcionarios: "/app/establecimiento-educativo/funcionarios",
  periodos: "/app/establecimiento-educativo/periodos",
  planeador: "/app/planeador/actividades",
  informes: "/app/gestion-academica/informes",
  referentes: "/app/gestion-academica/referentes-curriculares",
  asistencia: "/app/asistencia",
  chat: "/app/comunicaciones/chat",
} as const

const ALL_MENU_URLS = Object.values(MENU)

/** Se abre con cualquier menú (incluso vacío). */
const ALWAYS = "ALWAYS"
/** Ningún ítem de menú la otorga: queda bloqueada para todos. */
const NONE = "NONE"

type Owner = (typeof MENU)[keyof typeof MENU] | typeof ALWAYS | typeof NONE

/** fullPath de la ruta (como la declara el router) → dueño. */
const ROUTE_OWNERS: Record<string, Owner> = {
  "/app/": ALWAYS,
  "/app/sin-acceso": ALWAYS,

  // Sin ítem de menú ni en el mock ni en el backend (y sus endpoints solo
  // existen en MSW): bloqueada para todos.
  "/app/cobertura/reserva-de-cupo": NONE,
  "/app/cobertura/pre-matricula": MENU.preMatricula,
  "/app/cobertura/inscritos": MENU.inscritos,
  "/app/cobertura/inscritos/$enrollmentId": MENU.inscritos,
  "/app/cobertura/matricula": MENU.matricula,
  "/app/cobertura/matricula/agregar": MENU.matricula,
  "/app/cobertura/matricula/configuracion": MENU.matricula,
  "/app/cobertura/matricula/detalle/$matriculaId": MENU.matricula,
  "/app/cobertura/matricula/detalle/$matriculaId/editar": MENU.matricula,

  "/app/registro-de-actividad/sesiones": MENU.registroActividad,
  "/app/registro-de-actividad/sesiones/$sessionId/operaciones": MENU.registroActividad,
  "/app/registro-de-actividad/tablas": MENU.registroActividad,
  "/app/registro-de-actividad/tablas/$tableSlug": MENU.registroActividad,
  "/app/administracion/roles-menus": MENU.rolesMenus,

  "/app/establecimiento-educativo/general": MENU.establecimiento,
  "/app/establecimiento-educativo/agregar": MENU.establecimiento,
  "/app/establecimiento-educativo/editar/$establishmentId": MENU.establecimiento,
  "/app/establecimiento-educativo/sedes": MENU.sedes,
  "/app/establecimiento-educativo/funcionarios": MENU.funcionarios,
  "/app/establecimiento-educativo/periodos": MENU.periodos,
  "/app/establecimiento-educativo/periodos/agregar": MENU.periodos,
  "/app/establecimiento-educativo/periodos/$periodId/editar": MENU.periodos,

  "/app/gestion-academica/informes": MENU.informes,
  "/app/gestion-academica/informes/planilla/$grupoId/$asignaturaId/$periodoId": MENU.informes,
  "/app/gestion-academica/referentes-curriculares": MENU.referentes,
  "/app/gestion-academica/referentes-curriculares/detalle/$curricularReferenceId": MENU.referentes,

  "/app/planeador/actividades": MENU.planeador,
  "/app/planeador/actividades/agregar": MENU.planeador,
  "/app/planeador/actividades/$actividadId/editar": MENU.planeador,
  "/app/planeador/unidades": MENU.planeador,
  "/app/planeador/unidades/agregar": MENU.planeador,
  "/app/planeador/unidades/editar/$unidadId": MENU.planeador,
  "/app/planeador/planilla": MENU.planeador,
  "/app/planeador/recursos/vista-previa": MENU.planeador,

  "/app/asistencia": MENU.asistencia,
  "/app/asistencia/seguimiento": MENU.asistencia,
  "/app/asistencia/manual": MENU.asistencia,

  "/app/comunicaciones/chat": MENU.chat,
}

interface RouteLike {
  fullPath: string
  children?: unknown
}

function hasChildren(route: RouteLike) {
  const { children } = route
  if (!children) return false
  return Array.isArray(children) ? children.length > 0 : Object.keys(children).length > 0
}

/** Rutas hoja (las que pintan una pantalla) debajo de `/app`. */
const appLeafRoutes = (Object.values(router.routesById) as RouteLike[])
  .filter((route) => route.fullPath.startsWith("/app") && !hasChildren(route))
  .map((route) => route.fullPath)

/** `$param` → un valor cualquiera: el guard compara URLs concretas. */
const toConcretePath = (fullPath: string) => fullPath.replace(/\$[^/]+/g, "123")

describe("dueño de cada ruta de /app", () => {
  it("toda ruta del router tiene dueño declarado (y no sobran entradas)", () => {
    expect([...appLeafRoutes].sort()).toEqual(Object.keys(ROUTE_OWNERS).sort())
  })

  it.each(appLeafRoutes)("%s", (fullPath) => {
    const owner = ROUTE_OWNERS[fullPath]
    const path = toConcretePath(fullPath)

    if (owner === ALWAYS) {
      expect(canAccessPath(path, [])).toBe(true)
      return
    }

    if (owner === NONE) {
      expect(canAccessPath(path, ALL_MENU_URLS)).toBe(false)
      return
    }

    // Su ítem la abre…
    expect(canAccessPath(path, [owner])).toBe(true)
    // …y ningún otro, ni todos los demás juntos.
    expect(
      canAccessPath(
        path,
        ALL_MENU_URLS.filter((url) => url !== owner),
      ),
    ).toBe(false)
  })
})

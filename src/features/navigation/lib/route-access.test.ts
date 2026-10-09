import { describe, expect, it } from "vitest"

import {
  canAccessPath,
  getMenuUrls,
  isAlwaysAllowedPath,
  isUnder,
  resolveNavPathname,
} from "@/features/navigation/lib/route-access"

describe("isUnder", () => {
  it("acepta la misma URL y lo que cuelga de ella", () => {
    expect(isUnder("/app/cobertura/matricula", "/app/cobertura/matricula")).toBe(true)
    expect(isUnder("/app/cobertura/matricula/agregar", "/app/cobertura/matricula")).toBe(true)
    expect(isUnder("/app/cobertura/matricula/detalle/5/editar", "/app/cobertura/matricula")).toBe(
      true,
    )
  })

  it("respeta el límite de segmento", () => {
    expect(isUnder("/app/cobertura/matriculas", "/app/cobertura/matricula")).toBe(false)
    expect(isUnder("/app/cobertura/matricula-x/1", "/app/cobertura/matricula")).toBe(false)
    expect(isUnder("/app/cobertura", "/app/cobertura/matricula")).toBe(false)
  })

  it("ignora barras finales y query/hash", () => {
    expect(isUnder("/app/asistencia/", "/app/asistencia")).toBe(true)
    expect(isUnder("/app/asistencia/manual", "/app/asistencia/")).toBe(true)
    expect(isUnder("/app/asistencia", "/app/asistencia?vista=mes")).toBe(true)
    expect(isUnder("/app/asistencia", "/app/asistencia#x")).toBe(true)
  })
})

describe("resolveNavPathname", () => {
  it("resuelve las rutas hermanas a la URL de su ítem", () => {
    expect(resolveNavPathname("/app/establecimiento-educativo/agregar")).toBe(
      "/app/establecimiento-educativo/general",
    )
    expect(resolveNavPathname("/app/establecimiento-educativo/editar/12")).toBe(
      "/app/establecimiento-educativo/general",
    )
    expect(resolveNavPathname("/app/registro-de-actividad/tablas/tmatricula")).toBe(
      "/app/registro-de-actividad/sesiones",
    )
    expect(resolveNavPathname("/app/planeador/unidades/editar/3")).toBe(
      "/app/planeador/actividades",
    )
    expect(resolveNavPathname("/app/planeador/planilla")).toBe("/app/planeador/actividades")
    expect(resolveNavPathname("/app/planeador/recursos/vista-previa")).toBe(
      "/app/planeador/actividades",
    )
  })

  it("deja igual lo que no es alias (ni un prefijo parecido)", () => {
    expect(resolveNavPathname("/app/cobertura/matricula/agregar")).toBe(
      "/app/cobertura/matricula/agregar",
    )
    expect(resolveNavPathname("/app/establecimiento-educativo/agregarx")).toBe(
      "/app/establecimiento-educativo/agregarx",
    )
  })
})

describe("getMenuUrls", () => {
  it("aplana grupos e ítems", () => {
    const urls = getMenuUrls([
      {
        url: "/app/cobertura/inscritos",
        items: [{ url: "/app/cobertura/inscritos" }, { url: "/app/cobertura/matricula" }],
      },
      { url: "/app/asistencia" },
    ])
    expect(urls).toEqual(
      expect.arrayContaining([
        "/app/cobertura/inscritos",
        "/app/cobertura/matricula",
        "/app/asistencia",
      ]),
    )
  })

  it("descarta URLs vacías o tan amplias que abrirían todo", () => {
    expect(
      getMenuUrls([{ url: "/app", items: [{ url: "/" }, { url: "" }, { url: "/app/" }] }]),
    ).toEqual([])
  })
})

describe("canAccessPath", () => {
  const rector = getMenuUrls([
    {
      url: "/app/cobertura/matricula",
      items: [{ url: "/app/cobertura/matricula" }, { url: "/app/cobertura/inscritos" }],
    },
    {
      url: "/app/establecimiento-educativo/general",
      items: [
        { url: "/app/establecimiento-educativo/general" },
        { url: "/app/establecimiento-educativo/sedes" },
      ],
    },
    { url: "/app/asistencia", items: [{ url: "/app/asistencia" }] },
  ])

  it("bloquea un módulo que no está en el menú (caso de QA)", () => {
    expect(canAccessPath("/app/administracion/roles-menus", rector)).toBe(false)
    expect(canAccessPath("/app/registro-de-actividad/sesiones", rector)).toBe(false)
    expect(canAccessPath("/app/planeador/actividades", rector)).toBe(false)
  })

  it("permite el ítem y sus subrutas anidadas", () => {
    expect(canAccessPath("/app/cobertura/matricula", rector)).toBe(true)
    expect(canAccessPath("/app/cobertura/matricula/detalle/5", rector)).toBe(true)
    expect(canAccessPath("/app/cobertura/matricula/detalle/5/editar", rector)).toBe(true)
    expect(canAccessPath("/app/cobertura/inscritos/77", rector)).toBe(true)
    expect(canAccessPath("/app/asistencia/manual", rector)).toBe(true)
  })

  it("no concede por un prefijo que no corta en segmento", () => {
    expect(canAccessPath("/app/cobertura/matriculas", rector)).toBe(false)
    expect(canAccessPath("/app/asistencia-x", rector)).toBe(false)
  })

  it("permite las rutas hermanas (alias) solo si su ítem dueño está en el menú", () => {
    expect(canAccessPath("/app/establecimiento-educativo/agregar", rector)).toBe(true)
    expect(canAccessPath("/app/establecimiento-educativo/editar/9", rector)).toBe(true)

    const soloSedes = ["/app/establecimiento-educativo/sedes"]
    expect(canAccessPath("/app/establecimiento-educativo/agregar", soloSedes)).toBe(false)
    expect(canAccessPath("/app/establecimiento-educativo/editar/9", soloSedes)).toBe(false)

    const planeador = ["/app/planeador/actividades"]
    expect(canAccessPath("/app/planeador/unidades", planeador)).toBe(true)
    expect(canAccessPath("/app/planeador/unidades/editar/4", planeador)).toBe(true)
    expect(canAccessPath("/app/planeador/planilla", planeador)).toBe(true)
    expect(canAccessPath("/app/planeador/recursos/vista-previa", planeador)).toBe(true)
    expect(canAccessPath("/app/planeador/unidades", rector)).toBe(false)

    const registro = ["/app/registro-de-actividad/sesiones"]
    expect(canAccessPath("/app/registro-de-actividad/tablas", registro)).toBe(true)
    expect(canAccessPath("/app/registro-de-actividad/tablas/tmatricula", registro)).toBe(true)
    expect(canAccessPath("/app/registro-de-actividad/sesiones/abc/operaciones", registro)).toBe(
      true,
    )
  })

  it("un ítem propio en la ruta del alias también da acceso directo", () => {
    expect(canAccessPath("/app/planeador/unidades/agregar", ["/app/planeador/unidades"])).toBe(true)
  })

  it("`/app` y `/app/sin-acceso` se abren con cualquier menú, incluso vacío", () => {
    expect(isAlwaysAllowedPath("/app")).toBe(true)
    expect(isAlwaysAllowedPath("/app/")).toBe(true)
    expect(canAccessPath("/app", [])).toBe(true)
    expect(canAccessPath("/app/sin-acceso", [])).toBe(true)
    expect(canAccessPath("/app/sin-acceso/", [])).toBe(true)
  })

  it("con el menú vacío no se abre ningún módulo", () => {
    expect(canAccessPath("/app/cobertura/matricula", [])).toBe(false)
    expect(canAccessPath("/app/asistencia", [])).toBe(false)
  })

  it("una fila de menú con la raíz como URL no abre todo", () => {
    const menuRaro = getMenuUrls([{ url: "/app", items: [{ url: "/" }, { url: "/app" }] }])
    expect(canAccessPath("/app/administracion/roles-menus", menuRaro)).toBe(false)
  })
})

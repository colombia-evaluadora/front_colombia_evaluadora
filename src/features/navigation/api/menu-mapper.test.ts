import { describe, expect, it } from "vitest"

import { toNavItemDtos, type MenuSource } from "@/features/navigation/api/menu-mapper"

const menu = (m: Partial<MenuSource> & Pick<MenuSource, "id" | "name">): MenuSource => ({
  icon: null,
  path: null,
  menuOrder: m.id,
  idParent: null,
  visible: true,
  ...m,
})

describe("toNavItemDtos", () => {
  it("un grupo con hijos hereda la ruta del primer hijo e ignora la suya", () => {
    const items = toNavItemDtos([
      menu({ id: 916, name: "Comunicaciones", path: "/app/comunicaciones/chat" }),
      menu({ id: 957, name: "Notificaciones", path: "/app/notificaciones", idParent: 916 }),
    ])
    expect(items).toEqual([
      expect.objectContaining({
        title: "Comunicaciones",
        url: "/app/notificaciones",
        items: [expect.objectContaining({ url: "/app/notificaciones" })],
      }),
    ])
  })

  // QA 94: el menú del Supervisor territorial trae COMUNICADOS_TERRITORIAL como raíz sin hijos.
  it("una raíz sin hijos visibles se pinta con su propia ruta", () => {
    const items = toNavItemDtos([
      menu({ id: 938, name: "Comunicados institucionales", path: "/app/comunicaciones/comunicados-territorial" }),
      menu({ id: 936, name: "Procesos de postulación y elección", path: "/app/comunicaciones/procesos" }),
      menu({ id: 937, name: "Crear procesos", path: "/app/comunicaciones/procesos", idParent: 936, visible: false }),
    ])
    expect(items.map((i) => [i.title, i.url, i.items])).toEqual([
      ["Procesos de postulación y elección", "/app/comunicaciones/procesos", undefined],
      ["Comunicados institucionales", "/app/comunicaciones/comunicados-territorial", undefined],
    ])
  })

  it("descarta una raíz sin hijos ni ruta y los menús ocultos", () => {
    const items = toNavItemDtos([
      menu({ id: 1, name: "Vacío" }),
      menu({ id: 2, name: "Oculto", path: "/app/x", visible: false }),
    ])
    expect(items).toEqual([])
  })
})

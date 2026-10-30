import { describe, expect, it } from "vitest"

import { paths } from "@/config/paths"
import { CATALOGO_RUTAS } from "@/features/assistant/lib/catalogo-rutas"
import { extraerParams, validarNavegacionSubruta } from "@/features/assistant/lib/navegacion-ui"
import type { MenuPermission } from "@/features/navigation/api/types/menu-permission"

/** Todos los `path` de `paths.app`, como patrón completo `/app/...`. */
function patronesApp(): Set<string> {
  const patrones = new Set<string>()
  const recorrer = (nodo: unknown) => {
    if (!nodo || typeof nodo !== "object") return
    const { path } = nodo as { path?: unknown }
    if (typeof path === "string") patrones.add(path.startsWith("/") ? path : `/app/${path}`)
    for (const hijo of Object.values(nodo)) if (hijo && typeof hijo === "object") recorrer(hijo)
  }
  recorrer(paths.app)
  return patrones
}

const permiso = (codigo: string, cambios: Partial<MenuPermission> = {}): MenuPermission => ({
  pk_tmenu: 1,
  codigo,
  nombre: codigo,
  path: "",
  puede_crear: true,
  puede_editar: true,
  puede_eliminar: false,
  puede_ver: true,
  ...cambios,
})

describe("catálogo de rutas del asistente", () => {
  it("cada ruta existe en paths.ts y los códigos no se repiten", () => {
    const patrones = patronesApp()
    for (const ruta of CATALOGO_RUTAS) expect(patrones, ruta.codigo).toContain(ruta.ruta)
    expect(new Set(CATALOGO_RUTAS.map((r) => r.codigo)).size).toBe(CATALOGO_RUTAS.length)
  })

  it("cada $param de la ruta está descrito", () => {
    for (const ruta of CATALOGO_RUTAS) {
      const nombres = ruta.ruta
        .split("/")
        .filter((s) => s.startsWith("$"))
        .map((s) => s.slice(1))
      expect(Object.keys(ruta.params ?? {}).sort(), ruta.codigo).toEqual(nombres.sort())
    }
  })
})

describe("validarNavegacionSubruta", () => {
  const rutaDelRouter = () => ({ options: { validateSearch: undefined } })

  it("extrae los params de la URL concreta", () => {
    expect(extraerParams("/app/x/detalle/$id/editar", "/app/x/detalle/12/editar")).toEqual({ id: "12" })
    expect(extraerParams("/app/x/detalle/$id", "/app/x/otra/12")).toBeNull()
  })

  it("navega con permiso y rechaza sin permiso de editar", () => {
    const accion = { subruta: "matricula.editar", url: "/app/cobertura/matricula/detalle/7/editar" }
    const ok = validarNavegacionSubruta(accion, { rutaDelRouter, permisos: [permiso("MATRICULA")] })
    expect(ok).toEqual({
      ok: true,
      destino: { to: "/app/cobertura/matricula/detalle/$matriculaId/editar", params: { matriculaId: "7" }, search: {} },
    })
    const sinEditar = validarNavegacionSubruta(accion, {
      rutaDelRouter,
      permisos: [permiso("MATRICULA", { puede_editar: false })],
    })
    expect(sinEditar.ok).toBe(false)
  })

  it("descarta search params no declarados y rechaza ids raros", () => {
    const r = validarNavegacionSubruta(
      { subruta: "planeador.actividades", url: "/app/planeador/actividades", params: { actividad: "5", otro: "x" } },
      { rutaDelRouter, permisos: [permiso("PLANEADOR")] },
    )
    expect(r.ok && r.destino.search).toEqual({ actividad: "5" })
    const raro = validarNavegacionSubruta(
      { subruta: "matricula.detalle", url: "/app/cobertura/matricula/detalle/%3Cscript%3E" },
      { rutaDelRouter, permisos: [permiso("MATRICULA")] },
    )
    expect(raro.ok).toBe(false)
  })
})

import { describe, expect, it, vi } from "vitest"

import { aplicarAcciones, esRutaInterna } from "@/features/assistant/lib/acciones-ui"

describe("esRutaInterna", () => {
  it("solo admite rutas /app", () => {
    expect(esRutaInterna("/app/planeador/actividades")).toBe(true)
    expect(esRutaInterna("/app")).toBe(true)
    expect(esRutaInterna("//evil.com/app")).toBe(false)
    expect(esRutaInterna("https://evil.com")).toBe(false)
    expect(esRutaInterna("javascript:alert(1)")).toBe(false)
    expect(esRutaInterna("/login")).toBe(false)
  })
})

describe("aplicarAcciones", () => {
  it("descarta op desconocidas, navega y filtra solo lo declarado", () => {
    const navegar = vi.fn()
    const aplicarFiltrosUrl = vi.fn()
    const resultados = aplicarAcciones(
      [
        { op: "ENVIAR", formulario: "x" },
        { op: "NAVEGAR", pantalla: "planeador", url: "/app/planeador/actividades", params: {} },
        { op: "APLICAR_FILTROS", filtros: { sede: "1", otro: "x" } },
        { op: "RELLENAR", formulario: "funcionario.crear", valores: { nombres: "Ana" } },
      ],
      { navegar, aplicarFiltrosUrl, filtrosDeLaPantalla: ["sede"] },
    )
    expect(resultados).toHaveLength(3)
    expect(navegar).toHaveBeenCalledWith("/app/planeador/actividades", {})
    expect(aplicarFiltrosUrl).toHaveBeenCalledWith({ sede: "1" })
    expect(resultados[2].aplicada).toBe(false)
  })
})

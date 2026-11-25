import { describe, expect, it } from "vitest"

import { getOnlineOnlyState, ONLINE_ONLY_TOOLTIP } from "@/lib/offline/use-online-only"

describe("getOnlineOnlyState", () => {
  it("habilita la acción en online y degraded", () => {
    for (const status of ["online", "degraded"] as const) {
      expect(getOnlineOnlyState(status)).toEqual({ disabled: false, reason: null, tooltip: null })
    }
  })

  it("deshabilita sin conexión con el tooltip estándar", () => {
    expect(getOnlineOnlyState("offline")).toEqual({
      disabled: true,
      reason: ONLINE_ONLY_TOOLTIP,
      tooltip: "Necesitas conexión para esta acción.",
    })
  })

  it("acepta un copy propio de la vista", () => {
    const copy = "Los cambios de roles y menús necesitan conexión."
    expect(getOnlineOnlyState("offline", copy).tooltip).toBe(copy)
  })
})

describe("isOfflineWithoutData", async () => {
  const { isOfflineWithoutData } = await import("@/lib/offline/query-status")

  it("detecta una query pausada sin datos", () => {
    expect(isOfflineWithoutData({ data: undefined, fetchStatus: "paused", isError: false }, "offline")).toBe(true)
  })

  it("no lo marca si hay datos restaurados o si hay red", () => {
    expect(isOfflineWithoutData({ data: [], fetchStatus: "paused", isError: false }, "offline")).toBe(false)
    expect(isOfflineWithoutData({ data: undefined, fetchStatus: "idle", isError: true }, "online")).toBe(false)
  })
})

describe("isOnlineOnlyPath", async () => {
  const { isOnlineOnlyPath } = await import("@/lib/offline/online-only-paths")

  it("todos los módulos se consultan sin red", () => {
    for (const p of ["cobertura/matricula/detalle/5", "gestion-estudiantil/observador", "administracion/roles-menus", "registro-de-actividad/sesiones", "establecimiento-educativo/funcionarios", "planeador/actividades", "asistencia"])
      expect(isOnlineOnlyPath("/app/" + p)).toBe(false)
  })

  it("ningún formulario se bloquea; los que no encolan avisan que guardar necesita conexión", async () => {
    const { guardarNecesitaConexion } = await import("@/lib/offline/online-only-paths")
    for (const p of ["cobertura/matricula/agregar", "cobertura/matricula/detalle/5/editar", "establecimiento-educativo/editar/3", "comunicaciones/comunicados/nuevo"]) {
      expect(isOnlineOnlyPath("/app/" + p)).toBe(false)
      expect(guardarNecesitaConexion("/app/" + p)).toBe(true)
    }
    expect(guardarNecesitaConexion("/app/planeador/actividades/agregar")).toBe(false)
    expect(isOnlineOnlyPath("/app/mis-dispositivos")).toBe(true)
  })
})

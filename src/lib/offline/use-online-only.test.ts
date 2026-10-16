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

  it("marca las vistas solo en línea del plan §8 y deja pasar las offline", () => {
    expect(isOnlineOnlyPath("/app/cobertura/matricula")).toBe(true)
    expect(isOnlineOnlyPath("/app/registro-de-actividad/sesiones")).toBe(true)
    expect(isOnlineOnlyPath("/app/planeador/actividades")).toBe(false)
    expect(isOnlineOnlyPath("/app/asistencia")).toBe(false)
    expect(isOnlineOnlyPath("/app/coberturas")).toBe(false)
  })

  it("deja consultar periodos, horario y asignaciones sin red (Fase 4), pero no agregar ni el resto de establecimiento", () => {
    expect(isOnlineOnlyPath("/app/establecimiento-educativo/periodos")).toBe(false)
    expect(isOnlineOnlyPath("/app/establecimiento-educativo/periodos/12/editar")).toBe(false)
    expect(isOnlineOnlyPath("/app/establecimiento-educativo/periodos/agregar")).toBe(true)
    expect(isOnlineOnlyPath("/app/establecimiento-educativo/sedes")).toBe(true)
    expect(isOnlineOnlyPath("/app/administracion/roles-menus")).toBe(true)
  })
})

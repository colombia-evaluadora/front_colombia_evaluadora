import { describe, expect, it } from "vitest"

import { DEEP_LINK_FALLBACK, safeDeepLink } from "@/features/notificaciones/lib/deep-link"

describe("safeDeepLink › alias", () => {
  it("lleva /app/cuenta (AUTORIZACION_PENDIENTE) a Mi cuenta conservando la sección", () => {
    expect(safeDeepLink("/app/cuenta?seccion=autorizaciones")).toBe("/app/mi-cuenta?seccion=autorizaciones")
    expect(safeDeepLink("/app/cuenta/")).toBe("/app/mi-cuenta")
  })

  it("no toca otras rutas que empiezan igual", () => {
    expect(safeDeepLink("/app/cuentas-x?a=1")).toBe("/app/cuentas-x?a=1")
    expect(safeDeepLink("https://x.com/app/cuenta")).toBe(DEEP_LINK_FALLBACK)
  })
})

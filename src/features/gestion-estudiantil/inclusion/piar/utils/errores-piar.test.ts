import { describe, expect, it } from "vitest"

import { mensajePiar } from "@/features/gestion-estudiantil/inclusion/piar/utils/errores-piar"

const http = (status: number, message: string) => ({ isAxiosError: true, message, response: { status, data: { message } } })

describe("mensajePiar", () => {
  it("deja pasar la regla de negocio", () => {
    expect(mensajePiar(http(400, "La fecha de elaboración no puede ser posterior a hoy"))).toBe("La fecha de elaboración no puede ser posterior a hoy")
  })
  it("oculta binds y errores técnicos", () => {
    const m = mensajePiar(http(400, "El parámetro 'BODY.RELACION' es obligatorio (tipo VARCHAR)"))
    expect(m).not.toMatch(/BODY|VARCHAR/)
  })
  it("traduce permisos, servidor y red", () => {
    expect(mensajePiar(http(403, "x"))).toMatch(/permiso/)
    expect(mensajePiar(http(500, "NPE"))).not.toMatch(/NPE/)
    expect(mensajePiar({ isAxiosError: true, message: "Network Error" })).toMatch(/conexión/)
  })
})

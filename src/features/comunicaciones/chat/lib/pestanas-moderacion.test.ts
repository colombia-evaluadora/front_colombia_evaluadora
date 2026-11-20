import { describe, expect, it } from "vitest"

import { pestanasModeracion } from "@/features/comunicaciones/chat/lib/pestanas-moderacion"

const ids = (p: Parameters<typeof pestanasModeracion>[0]) => pestanasModeracion(p).map(([id]) => id)

describe("pestanasModeracion", () => {
  it("el rector ve Suspensiones y Configuración, no Reportes", () => {
    expect(ids({ esAdministrador: true, puedeSuspender: true, puedeRevisarReportes: false })).toEqual([
      "suspensiones",
      "configuracion",
    ])
  })

  it("el supervisor de sede ve Reportes y Suspensiones", () => {
    expect(ids({ esAdministrador: false, puedeSuspender: true, puedeRevisarReportes: true })).toEqual([
      "reportes",
      "suspensiones",
    ])
  })

  it("sin permisos (o mientras carga la política) no hay pestañas", () => {
    expect(ids({ esAdministrador: false, puedeSuspender: false, puedeRevisarReportes: false })).toEqual([])
  })
})

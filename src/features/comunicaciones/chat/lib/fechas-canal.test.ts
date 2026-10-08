import { describe, expect, it } from "vitest"
import { z } from "zod"

import { validarRangoFechas } from "@/features/comunicaciones/chat/lib/fechas-canal"

const schema = z
  .object({ fechaInicio: z.string().nullable(), fechaCierre: z.string().nullable() })
  .superRefine(validarRangoFechas)

const errores = (fechaInicio: string | null, fechaCierre: string | null) => {
  const r = schema.safeParse({ fechaInicio, fechaCierre })
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]))
}

describe("validarRangoFechas", () => {
  it("acepta un cierre posterior, aunque las fechas ya hayan pasado", () => {
    expect(errores("2020-10-07T00:00", "2020-10-07T06:00")).toEqual({})
  })

  it("exige ambas fechas", () => {
    expect(Object.keys(errores(null, null))).toEqual(["fechaInicio", "fechaCierre"])
  })

  it("exige que el cierre sea posterior al inicio, también en la hora", () => {
    expect(errores("2026-10-08T09:00", "2026-10-08T09:00").fechaCierre).toMatch(/posterior/)
    expect(errores("2026-10-08T09:00", "2026-10-08T08:59").fechaCierre).toMatch(/posterior/)
  })
})

import { describe, expect, it } from "vitest"

import { erroresRecuperacion, recuperacionFaltantes } from "@/features/planeador/lib/recuperacion-faltantes"

const base = {
  esRecuperacion: true,
  recuperacionDestino: "",
  recuperacionActividadId: undefined,
  recuperacionTipoAplicacion: "",
  recuperacionTipoCalculo: "",
  recuperacionValorPonderacion: undefined,
}

describe("erroresRecuperacion", () => {
  it("sin recuperación no exige nada", () => {
    expect(erroresRecuperacion({ ...base, esRecuperacion: false })).toEqual({})
  })

  it("recuperación vacía exige destino y tipo de aplicación", () => {
    expect(erroresRecuperacion(base)).toEqual({
      recuperacionDestino: "Indique qué desea recuperar (actividad o nota final).",
      recuperacionTipoAplicacion: "Indique cómo se aplicará la nota de la recuperación.",
    })
  })

  it("destino ACTIVIDAD exige la actividad a recuperar, con el rótulo", () => {
    const errores = erroresRecuperacion({ ...base, recuperacionDestino: "ACTIVIDAD" }, "experiencia")
    expect(errores.recuperacionActividadId).toBe("Seleccione qué experiencia se va a recuperar.")
  })

  it("destino NOTA_FINAL no exige actividad", () => {
    const errores = erroresRecuperacion({ ...base, recuperacionDestino: "NOTA_FINAL", recuperacionTipoAplicacion: "REEMPLAZAR" })
    expect(errores).toEqual({})
  })

  it("con REEMPLAZAR no se exige tipo de cálculo", () => {
    expect(
      erroresRecuperacion({
        ...base,
        recuperacionDestino: "ACTIVIDAD",
        recuperacionActividadId: 7,
        recuperacionTipoAplicacion: "REEMPLAZAR",
      }),
    ).toEqual({})
  })

  it("sin REEMPLAZAR exige el tipo de cálculo con el mensaje del backend", () => {
    const errores = erroresRecuperacion({
      ...base,
      recuperacionDestino: "ACTIVIDAD",
      recuperacionActividadId: 7,
      recuperacionTipoAplicacion: "COMPUTAR",
    })
    expect(errores).toEqual({
      recuperacionTipoCalculo: "Indique si la nota de la recuperación se promedia o se pondera con la original.",
    })
  })

  it("PONDERADO exige el porcentaje entre 0 y 100", () => {
    const ponderado = {
      ...base,
      recuperacionDestino: "NOTA_FINAL",
      recuperacionTipoAplicacion: "COMPUTAR",
      recuperacionTipoCalculo: "PONDERADO",
    }
    expect(erroresRecuperacion(ponderado).recuperacionValorPonderacion).toBe(
      "Indique el porcentaje (0 a 100) con que pondera la nota de la recuperación.",
    )
    expect(erroresRecuperacion({ ...ponderado, recuperacionValorPonderacion: 150 }).recuperacionValorPonderacion).toBe(
      "El porcentaje de la recuperación debe estar entre 0 y 100.",
    )
    expect(erroresRecuperacion({ ...ponderado, recuperacionValorPonderacion: 40 })).toEqual({})
  })

  it("PROMEDIADO no pide porcentaje", () => {
    expect(
      erroresRecuperacion({
        ...base,
        recuperacionDestino: "NOTA_FINAL",
        recuperacionTipoAplicacion: "COMPUTAR",
        recuperacionTipoCalculo: "PROMEDIADO",
      }),
    ).toEqual({})
  })
})

describe("recuperacionFaltantes", () => {
  it("lista los nombres visibles en el orden del form", () => {
    expect(recuperacionFaltantes({ ...base, recuperacionDestino: "ACTIVIDAD" })).toEqual([
      "¿Qué actividad deseas recuperar?",
      "¿Cómo se aplicará la nota de recuperación?",
    ])
  })
})

import { describe, expect, it } from "vitest"

import { formularioTanstack, primerError } from "@/features/assistant/lib/formulario-tanstack"

function formFalso(inicial: Record<string, unknown>, errores: Record<string, unknown[]> = {}) {
  const valores = { ...inicial }
  return {
    valores,
    getFieldValue: (campo: string) => valores[campo],
    setFieldValue: (campo: string, valor: unknown) => {
      valores[campo] = valor
    },
    getFieldMeta: (campo: string) => ({ errors: errores[campo] ?? [] }),
  }
}

describe("formularioTanstack", () => {
  const opciones = [
    { valor: "1", etiqueta: "Sede Norte" },
    { valor: "2", etiqueta: "Sede Sur" },
  ]

  it("expone valor, error y opciones de cada campo", () => {
    const form = formFalso({ sedeId: "1", inicio: "" }, { inicio: [{ message: "La fecha es obligatoria" }] })
    const registro = formularioTanstack(form, {
      codigo: "periodo_academico",
      campos: [
        { nombre: "sedeId", etiqueta: "Sede", tipo: "select", opciones },
        { nombre: "inicio", etiqueta: "Inicio", tipo: "date", obligatorio: true },
      ],
    })
    expect(registro.campos()).toEqual([
      { nombre: "sedeId", etiqueta: "Sede", tipo: "select", valor: "1", opciones },
      { nombre: "inicio", etiqueta: "Inicio", tipo: "date", obligatorio: true, valor: "", error: "La fecha es obligatoria" },
    ])
  })

  it("rellena con setFieldValue resolviendo etiquetas y descarta lo inválido o de solo lectura", () => {
    const form = formFalso({ sedeId: "", inicio: "", fin: "2026-12-01", reserva: false })
    const registro = formularioTanstack(form, {
      codigo: "periodo_academico",
      campos: [
        { nombre: "sedeId", etiqueta: "Sede", tipo: "select", opciones },
        { nombre: "inicio", etiqueta: "Inicio", tipo: "date" },
        { nombre: "fin", etiqueta: "Fin", tipo: "date", soloLectura: true },
        { nombre: "reserva", etiqueta: "Reserva", tipo: "checkbox" },
      ],
    })
    registro.rellenar({ sedeId: "sede sur", inicio: "no es fecha", fin: "2027-01-01", reserva: "si", otro: "x" })
    expect(form.valores).toEqual({ sedeId: "2", inicio: "", fin: "2026-12-01", reserva: true })
  })

  it("primerError lee strings e issues de zod", () => {
    expect(primerError([undefined, "Obligatorio"])).toBe("Obligatorio")
    expect(primerError([{ message: "Muy largo" }])).toBe("Muy largo")
    expect(primerError([])).toBeUndefined()
  })
})

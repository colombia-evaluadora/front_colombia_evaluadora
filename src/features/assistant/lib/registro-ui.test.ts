import { describe, expect, it } from "vitest"

import { acotarOpciones } from "@/features/assistant/lib/registro-ui"

const opciones = [
  { valor: "1", etiqueta: "Docente" },
  { valor: "2", etiqueta: "Rector" },
]

describe("acotarOpciones", () => {
  it("un select vacío manda todas las opciones", () => {
    const campo = { nombre: "cargo", etiqueta: "Cargo", tipo: "select" as const, valor: "", opciones }
    expect(acotarOpciones(campo).opciones).toHaveLength(2)
  })

  it("un select lleno manda solo la opción elegida", () => {
    const campo = { nombre: "cargo", etiqueta: "Cargo", tipo: "select" as const, valor: 2, opciones }
    expect(acotarOpciones(campo).opciones).toEqual([{ valor: "2", etiqueta: "Rector" }])
  })
})

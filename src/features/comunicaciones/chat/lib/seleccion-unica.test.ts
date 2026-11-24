import { describe, expect, it } from "vitest"

import { reemplazarSeleccion } from "./seleccion-unica"

const a = { id: 1 }
const b = { id: 2 }
const c = { id: 3 }

describe("reemplazarSeleccion", () => {
  it("elegir otra persona reemplaza a la anterior", () => {
    expect(reemplazarSeleccion([a], [a, b])).toEqual([b])
  })

  it("quitar la persona deja el campo vacío", () => {
    expect(reemplazarSeleccion([a], [])).toEqual([])
  })

  it("la primera elección queda tal cual", () => {
    expect(reemplazarSeleccion([], [a])).toEqual([a])
  })

  it("agregar a una selección de varias deja solo la nueva", () => {
    expect(reemplazarSeleccion([a, b], [a, b, c])).toEqual([c])
  })
})

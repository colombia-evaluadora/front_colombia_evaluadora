import { describe, expect, it } from "vitest"

import { predeterminadoDe, puedeElegirAspirantes, toOpcionesLista } from "./listas-valor"

describe("listas de valor del comunicado", () => {
  const filas = [
    { pk_lista_valor: 1, nombre: "Matriculados", valor: "MATRICULADOS", accion: null, predeterminado: true },
    { pk_lista_valor: 2, nombre: "Aspirantes", valor: "ASPIRANTES", accion: null },
  ]

  it("mapea las filas de /select a opciones con el código como valor", () => {
    expect(toOpcionesLista(filas)).toEqual([
      { valor: "MATRICULADOS", etiqueta: "Matriculados", predeterminado: true },
      { valor: "ASPIRANTES", etiqueta: "Aspirantes", predeterminado: false },
    ])
  })

  it("toma el predeterminado de la lista o, si no hay, el primero", () => {
    expect(predeterminadoDe(toOpcionesLista(filas))).toBe("MATRICULADOS")
    expect(predeterminadoDe(toOpcionesLista([{ ...filas[1] }]))).toBe("ASPIRANTES")
    expect(predeterminadoDe(undefined)).toBe("")
  })

  it("solo el administrador del establecimiento y el gestor administrativo eligen Aspirantes", () => {
    expect(puedeElegirAspirantes(["CEVAL-RECTOR"])).toBe(true)
    expect(puedeElegirAspirantes(["CEVAL-AUXILIAR_ADMINISTRATIVO"])).toBe(true)
    expect(puedeElegirAspirantes(["CEVAL-COORDINADOR"])).toBe(false)
    expect(puedeElegirAspirantes(undefined)).toBe(false)
  })
})

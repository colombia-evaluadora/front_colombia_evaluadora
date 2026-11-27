import { describe, expect, it } from "vitest"

import { predeterminadoDe, puedeElegirAspirantes, soloPublicaAspirantes, toOpcionesLista } from "./listas-valor"

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
    expect(puedeElegirAspirantes(["CEVAL-JEFE_SISTEMA_ESTABLECIMIENTO"])).toBe(true)
    expect(puedeElegirAspirantes(["CEVAL-COORDINADOR"])).toBe(false)
    expect(puedeElegirAspirantes(undefined)).toBe(false)
  })

  it("el gestor administrativo sin un rol mayor solo publica a aspirantes", () => {
    expect(soloPublicaAspirantes(["CEVAL-JEFE_SISTEMA_ESTABLECIMIENTO"])).toBe(true)
    expect(soloPublicaAspirantes(["CEVAL-JEFE_SISTEMA_ESTABLECIMIENTO", "CEVAL-RECTOR"])).toBe(false)
    expect(soloPublicaAspirantes(["CEVAL-RECTOR"])).toBe(false)
    expect(soloPublicaAspirantes(undefined)).toBe(false)
  })
})

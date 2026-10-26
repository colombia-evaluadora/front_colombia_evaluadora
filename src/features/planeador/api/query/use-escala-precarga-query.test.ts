import { describe, expect, it } from "vitest"

import { toEscalaPrecarga } from "@/features/planeador/api/query/use-escala-precarga-query"

// Reglas 40-42: el `descriptor` de cada nivel (TESCALA_VALORACION.DESCRIPCION, V71.1)
// precarga la descripción del nivel; si viene null, queda vacía para que la escriba el docente.
describe("toEscalaPrecarga", () => {
  const nivel = (etiqueta: string, descriptor: string | null, puntaje: number) => ({
    fkTescalaValoracion: 1,
    orden: 1,
    codigo: etiqueta.toUpperCase(),
    etiqueta,
    descriptor,
    puntaje,
  })

  it("precarga la descripción del nivel desde el descriptor", () => {
    const precarga = toEscalaPrecarga({
      niveles: [nivel("Bajo", "  No alcanza los desempeños básicos.  ", 1.5)],
    })
    expect(precarga.niveles).toEqual([
      { nombre: "Bajo", descripcion: "No alcanza los desempeños básicos.", ponderacion: 1.5 },
    ])
  })

  it("deja la descripción vacía cuando el nivel no tiene descriptor", () => {
    const precarga = toEscalaPrecarga({ niveles: [nivel("Superior", null, 4.9)] })
    expect(precarga.niveles[0]?.descripcion).toBe("")
  })
})

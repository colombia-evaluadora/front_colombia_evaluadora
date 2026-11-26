import { describe, expect, it } from "vitest"

import {
  abiertosHasta,
  armarArbol,
  celdasNodo,
  columnaDeEdad,
  columnasEdades,
  filasVisibles,
  indexar,
  nivelesMaximos,
  rangoEdades,
  type ConteoEdad,
} from "@/features/coverage/informes-reportes/lib/edades-tabla"

const fila = (p: Partial<ConteoEdad> & Pick<ConteoEdad, "nivel" | "medida">): ConteoEdad => ({
  k1: null, k2: null, k3: null, k4: null, k5: null, k6: null, orden: null, clave: null, cantidad: 0,
  edadPromedio: null, edadMin: null, edadMax: null, mediana: null, edadRecomendada: null, edadBaja: null, edadExtra: null,
  ...p,
})

describe("columnasEdades", () => {
  it("un grado (Sexto, 11 años) sale por edad con extremos abiertos", () => {
    expect(columnasEdades("AUTOMATICO", { desde: 9, hasta: 13 }).map((c) => c.label)).toEqual([
      "9 años o menos", "10 años", "11 años", "12 años", "13 años o más", "Sin calcular",
    ])
  })

  it("de Sexto a Octavo (9 a 15) pasa a rangos", () => {
    expect(columnasEdades("AUTOMATICO", { desde: 9, hasta: 15 }).map((c) => c.label)).toEqual([
      "9 años o menos", "10 a 11", "12 a 13", "14 años", "15 años o más", "Sin calcular",
    ])
  })

  it("de Sexto a Undécimo da los tramos del ejemplo", () => {
    expect(columnasEdades("RANGO", { desde: 9, hasta: 18 }).map((c) => c.label)).toEqual([
      "9 años o menos", "10 a 11", "12 a 13", "14 a 15", "16 a 17", "18 años o más", "Sin calcular",
    ])
  })

  it("por situación da una columna por situación", () => {
    expect(columnasEdades("SITUACION", null).map((c) => c.key)).toEqual(["BAJA_EDAD", "EN_EDAD", "PREEXTRAEDAD", "EXTRAEDAD", "SIN_CALCULAR"])
  })
})

describe("columnaDeEdad", () => {
  const rango = { desde: 9, hasta: 15 }
  const cols = columnasEdades("RANGO", rango)
  it("los extremos son abiertos", () => {
    expect(columnaDeEdad(7, cols, rango)).toBe("E9")
    expect(columnaDeEdad(20, cols, rango)).toBe("E15")
  })
  it("las edades del medio caen en su tramo", () => {
    expect(columnaDeEdad(11, cols, rango)).toBe("R10-11")
    expect(columnaDeEdad(14, cols, rango)).toBe("R14-14")
  })
  it("sin edad es Sin calcular", () => {
    expect(columnaDeEdad(null, cols, rango)).toBe("SIN_CALCULAR")
  })
})

describe("árbol y desglose", () => {
  const conteos: ConteoEdad[] = [
    fila({ nivel: 0, medida: "T", cantidad: 3, edadBaja: 9, edadExtra: 13 }),
    fila({ nivel: 1, medida: "T", k1: "Séptimo", orden: 7, cantidad: 1 }),
    fila({ nivel: 1, medida: "T", k1: "Sexto", orden: 6, cantidad: 2 }),
    fila({ nivel: 2, medida: "T", k1: "Sexto", k2: "6-1", orden: 6, cantidad: 2 }),
    fila({ nivel: 1, medida: "E", k1: "Sexto", orden: 6, clave: "8", cantidad: 1 }),
    fila({ nivel: 1, medida: "E", k1: "Sexto", orden: 6, clave: "11", cantidad: 1 }),
    fila({ nivel: 1, medida: "E", k1: "Séptimo", orden: 7, clave: null, cantidad: 1 }),
  ]
  const raiz = armarArbol(conteos)!

  it("ordena por el orden del grado y cuelga los hijos", () => {
    expect(raiz.hijos.map((n) => n.label)).toEqual(["Sexto", "Séptimo"])
    expect(raiz.hijos[0].hijos.map((n) => n.label)).toEqual(["6-1"])
    expect(nivelesMaximos(raiz)).toBe(1)
  })

  it("cuenta por columna con los extremos abiertos", () => {
    const rango = rangoEdades(raiz, conteos)
    const cols = columnasEdades("EDAD", rango)
    const de = indexar(conteos)
    expect(celdasNodo(raiz.hijos[0], "EDAD", cols, rango, de)).toMatchObject({ E9: 1, E11: 1 })
    expect(celdasNodo(raiz.hijos[1], "EDAD", cols, rango, de)).toMatchObject({ SIN_CALCULAR: 1 })
  })

  it("solo muestra los hijos de las filas abiertas", () => {
    expect(filasVisibles(raiz, new Set(), true).map((n) => n.label)).toEqual(["Sexto", "Séptimo"])
    expect(filasVisibles(raiz, abiertosHasta(raiz, 1), true).map((n) => n.label)).toEqual(["Sexto", "6-1", "Séptimo"])
    expect(filasVisibles(raiz, abiertosHasta(raiz, 1), false).map((n) => n.label)).toEqual(["Sexto", "Séptimo"])
  })
})

import { describe, expect, it } from "vitest"

import { toEscalaPrecarga, toEscalaVariantesConfig } from "@/features/planeador/api/query/use-escala-precarga-query"

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

// Regla 40: la precarga viaja en `variantes[].precarga` de la configuración.
describe("toEscalaVariantesConfig", () => {
  const nivel = { fkTescalaValoracion: 41, orden: 1, codigo: "BAJO", etiqueta: "Bajo", descriptor: null, puntaje: 1.5 }

  it("ofrece solo las variantes que llegan, con su precarga por modo", () => {
    const config = toEscalaVariantesConfig([
      { pk: 1, valor: "CUALITATIVA", nombre: "Cualitativa", precarga: { niveles: [nivel] } },
      { pk: 2, valor: "NUMERICA", nombre: "Numérica", precarga: { valorMinimo: 1, valorMaximo: 5 } },
    ])
    expect(config?.permitidas).toEqual(["Cualitativa", "Numérica"])
    expect(config?.precargas?.Cualitativa?.niveles).toEqual([{ nombre: "Bajo", descripcion: "", ponderacion: 1.5 }])
    expect(config?.precargas?.Numérica).toMatchObject({ valorMinimo: 1, valorMaximo: 5, niveles: [] })
  })

  it("CUANTITATIVA: solo NUMERICA", () => {
    const config = toEscalaVariantesConfig([
      { pk: 2, valor: "NUMERICA", nombre: "Numérica", precarga: { valorMinimo: 0, valorMaximo: 10 } },
    ])
    expect(config?.permitidas).toEqual(["Numérica"])
  })

  it("precarga null deja el formulario vacío y niveles [] no inventa niveles", () => {
    const config = toEscalaVariantesConfig([
      { pk: 1, valor: "CUALITATIVA", nombre: "Cualitativa", precarga: { niveles: [] } },
      { pk: 2, valor: "NUMERICA", nombre: "Numérica", precarga: null },
    ])
    expect(config?.precargas?.Cualitativa?.niveles).toEqual([])
    expect(config?.precargas?.Numérica).toMatchObject({ valorMinimo: 0, valorMaximo: undefined })
  })

  it("sin `precarga` en la respuesta (anterior a la Regla 40) pide el respaldo", () => {
    const config = toEscalaVariantesConfig([{ pk: 2, valor: "NUMERICA", nombre: "Numérica" }])
    expect(config?.permitidas).toEqual(["Numérica"])
    expect(config?.precargas).toBeUndefined()
  })

  it("sin variantes devuelve null (decide tipoEvaluacion)", () => {
    expect(toEscalaVariantesConfig(undefined)).toBeNull()
    expect(toEscalaVariantesConfig([])).toBeNull()
  })
})

// Sin escala de valoración (o sin niveles activos) no se precarga nada: `sinEscala` hace que
// el form avise y no deje guardar, aunque el backend rellene `valorMaximo` (nota máxima o 100).
describe("sinEscala", () => {
  const nivel = { fkTescalaValoracion: 41, orden: 1, codigo: "BAJO", etiqueta: "Bajo", descriptor: null, puntaje: 1.5 }

  it("GET escala-precarga: fkTescala null o niveles [] es sin escala", () => {
    expect(toEscalaPrecarga(null).sinEscala).toBe(true)
    expect(
      toEscalaPrecarga({
        contexto: { fkTasignatura: 1, fkTgrado: 6, fkTescala: null, escala: null },
        valorMaximo: 100,
        niveles: [],
      }).sinEscala,
    ).toBe(true)
    expect(toEscalaPrecarga({ contexto: { fkTasignatura: 1, fkTgrado: 6, fkTescala: 3, escala: "X" }, niveles: [] }).sinEscala).toBe(true)
    expect(toEscalaPrecarga({ contexto: { fkTasignatura: 1, fkTgrado: 6, fkTescala: 3, escala: "X" }, niveles: [nivel] }).sinEscala).toBe(false)
  })

  it("variantes: precarga null o niveles [] es sin escala", () => {
    const config = toEscalaVariantesConfig([
      { pk: 1, valor: "CUALITATIVA", nombre: "Cualitativa", precarga: { niveles: [] } },
      { pk: 2, valor: "NUMERICA", nombre: "Numérica", precarga: null },
    ])
    expect(config?.precargas?.Cualitativa?.sinEscala).toBe(true)
    expect(config?.precargas?.Numérica?.sinEscala).toBe(true)
    const conEscala = toEscalaVariantesConfig([
      { pk: 1, valor: "CUALITATIVA", nombre: "Cualitativa", precarga: { niveles: [nivel] } },
    ])
    expect(conEscala?.precargas?.Cualitativa?.sinEscala).toBe(false)
    // NUMERICA nunca trae niveles: cuenta como escala si trae el rango.
    const numerica = toEscalaVariantesConfig([
      { pk: 2, valor: "NUMERICA", nombre: "Numérica", precarga: { valorMinimo: 0, valorMaximo: 5 } },
    ])
    expect(numerica?.precargas?.Numérica?.sinEscala).toBe(false)
  })
})

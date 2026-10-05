import { describe, expect, it } from "vitest"

import type { Actividad, Criterio, EscalaValoracion } from "@/features/planeador/api/types/actividad"
import {
  faltantesEscala,
  faltantesInstrumento,
  faltantesListaCotejo,
  faltantesRubrica,
} from "@/features/planeador/lib/instrumento-faltantes"

const conPuntaje = { puntajeObligatorio: true }
const sinPuntaje = { puntajeObligatorio: false }

function criterio(patch: Partial<Criterio> = {}): Criterio {
  return {
    id: 1,
    nombre: "Comprensión",
    descripcion: "",
    excelente: "Comprende todo",
    excelentePonderacion: 5,
    niveles: [{ id: 2, nombre: "Básico", descripcion: "Comprende algo", ponderacion: 2 }],
    ponderacion: 0,
    ...patch,
  }
}

function escala(patch: Partial<EscalaValoracion> = {}): EscalaValoracion {
  return {
    id: 1,
    criteriosGenerales: "",
    tipo: "Numérica",
    valorMinimo: 1,
    valorMaximo: 5,
    interpretacionRangos: "",
    niveles: [],
    ...patch,
  }
}

describe("faltantesRubrica", () => {
  it("acepta una rúbrica completa", () => {
    expect(faltantesRubrica({ id: 1, criterios: [criterio()] }, conPuntaje)).toEqual([])
  })

  it("exige al menos un criterio", () => {
    expect(faltantesRubrica({ id: 1, criterios: [] }, conPuntaje)).toEqual(["La rúbrica necesita al menos un criterio."])
  })

  it("avisa criterio sin nombre y niveles sin descripción", () => {
    const faltantes = faltantesRubrica(
      { id: 1, criterios: [criterio({ nombre: "", excelente: "", excelentePonderacion: undefined, niveles: [{ id: 2, nombre: "Básico", descripcion: "", ponderacion: 1 }] })] },
      sinPuntaje,
    )
    expect(faltantes).toEqual([
      "El criterio 1 de la rúbrica no tiene nombre.",
      "Cada nivel del criterio 1 necesita su descripción o juicio de valor.",
    ])
  })

  it("exige al menos un nivel por criterio (Excelente cuenta si tiene contenido)", () => {
    const sinNiveles = criterio({ excelente: "", excelentePonderacion: undefined, niveles: [] })
    expect(faltantesRubrica({ id: 1, criterios: [sinNiveles] }, sinPuntaje)).toEqual([
      'El criterio "Comprensión" de la rúbrica necesita al menos un nivel de desempeño.',
    ])
    const soloExcelente = criterio({ niveles: [] })
    expect(faltantesRubrica({ id: 1, criterios: [soloExcelente] }, conPuntaje)).toEqual([])
  })

  it("el puntaje solo es obligatorio si la unidad pondera o suma", () => {
    const sinPuntajes = criterio({ excelentePonderacion: undefined, niveles: [{ id: 2, nombre: "Básico", descripcion: "x" }] })
    expect(faltantesRubrica({ id: 1, criterios: [sinPuntajes] }, sinPuntaje)).toEqual([])
    expect(faltantesRubrica({ id: 1, criterios: [sinPuntajes] }, conPuntaje)).toEqual([
      'Cada nivel del criterio "Comprensión" necesita su puntaje.',
    ])
  })

  it("rechaza puntajes repetidos o fuera de rango", () => {
    expect(faltantesRubrica({ id: 1, criterios: [criterio({ excelentePonderacion: 2 })] }, conPuntaje)).toEqual([
      'El criterio "Comprensión" tiene dos niveles con el mismo puntaje.',
    ])
    expect(faltantesRubrica({ id: 1, criterios: [criterio({ excelentePonderacion: 150 })] }, sinPuntaje)).toEqual([
      'Cada nivel del criterio "Comprensión" necesita un puntaje entre 0 y 100.',
    ])
  })
})

describe("faltantesListaCotejo", () => {
  it("exige ítems con descripción y, si la unidad lo pide, puntaje", () => {
    expect(faltantesListaCotejo({ id: 1, items: [] }, sinPuntaje)).toEqual(["La lista de cotejo necesita al menos un ítem."])
    expect(faltantesListaCotejo({ id: 1, items: [{ id: 1, descripcion: " " }] }, conPuntaje)).toEqual([
      "Cada ítem de la lista de cotejo necesita su descripción.",
      "Cada ítem de la lista de cotejo necesita su puntaje.",
    ])
    expect(faltantesListaCotejo({ id: 1, items: [{ id: 1, descripcion: "Trae el material" }] }, sinPuntaje)).toEqual([])
  })

  it("rechaza un total posible de 0", () => {
    expect(faltantesListaCotejo({ id: 1, items: [{ id: 1, descripcion: "a", ponderacion: 0 }] }, conPuntaje)).toEqual([
      "Todos los ítems de la lista de cotejo tienen puntaje 0: el total posible no puede ser 0.",
    ])
  })
})

describe("faltantesEscala", () => {
  it("numérica: exige mínimo y máximo, con mínimo < máximo", () => {
    expect(faltantesEscala(escala())).toEqual([])
    expect(faltantesEscala(escala({ valorMinimo: undefined, valorMaximo: undefined }))).toEqual([
      "La escala numérica necesita valor mínimo y valor máximo.",
    ])
    expect(faltantesEscala(escala({ valorMinimo: 5, valorMaximo: 1 }))).toEqual([
      "En la escala el valor mínimo (5) debe ser menor que el máximo (1).",
    ])
  })

  it("cualitativa: cada nivel necesita puntaje y descriptor", () => {
    expect(faltantesEscala(escala({ tipo: "Cualitativa", niveles: [] }))).toEqual([
      "La escala cualitativa necesita al menos un nivel.",
    ])
    expect(
      faltantesEscala(escala({ tipo: "Cualitativa", niveles: [{ id: 1, nombre: "Bajo", descripcion: "" }] })),
    ).toEqual([
      "Cada nivel de la escala necesita un puntaje entre 0 y 100.",
      "Cada nivel de la escala necesita su interpretación o descriptor.",
    ])
  })
})

describe("faltantesInstrumento", () => {
  const base = {
    esEvaluativa: true,
    instrumento: "Otro",
    rubrica: { id: 1, criterios: [] },
    listaCotejo: { id: 1, items: [] },
    escalaValoracion: escala({ valorMinimo: undefined, valorMaximo: undefined }),
    instrumentoPersonalizado: { tipoEvidenciaEsperada: "", metodoValoracion: "" },
  } as unknown as Actividad

  it("no valida nada si la actividad no es sumativa o no tiene instrumento", () => {
    expect(faltantesInstrumento({ ...base, esEvaluativa: false }, conPuntaje)).toEqual([])
    expect(faltantesInstrumento({ ...base, instrumento: "" }, conPuntaje)).toEqual([])
  })

  it("Otro: exige tipo de evidencia, método y la definición del método", () => {
    expect(faltantesInstrumento(base, conPuntaje)).toEqual([
      "Indique el tipo de evidencia esperada del instrumento personalizado.",
      "Indique el método de valoración del instrumento personalizado.",
    ])
    const conMetodo = {
      ...base,
      instrumentoPersonalizado: { ...base.instrumentoPersonalizado, tipoEvidenciaEsperada: "Documento", metodoValoracion: "Escala de valoración" as const },
    }
    expect(faltantesInstrumento(conMetodo, conPuntaje)).toEqual(["La escala numérica necesita valor mínimo y valor máximo."])
  })
})

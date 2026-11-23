import { describe, expect, it } from "vitest"
import { CONJUNTO_VACIO, type Cascada, type Conjunto } from "@/features/comunicaciones/comunicados/api/comunicado-documento"
import { erroresConjunto, sinPeriodos, TODAS_LAS_JORNADAS } from "@/features/comunicaciones/comunicados/lib/conjunto"

// Cascada de una sede sin períodos Abiertos (QA 91): la sede y la jornada se eligen, pero no hay años.
const sinAnios: Cascada = {
  establecimientos: [{ valor: "100", etiqueta: "Colegio", detalle: null, total: 0 }],
  sedes: [{ valor: "203", etiqueta: "Rural", detalle: null, total: 0 }],
  jornadas: [{ valor: "3", etiqueta: "Mañana", detalle: null, total: 0 }],
  anios: [],
  modalidades: [],
  ciclos: [],
  periodo: null,
  grados: [],
  grupos: [],
  estudiantes: [],
  roles: [{ valor: "DOCENTE", etiqueta: "Docente", detalle: null, total: 1 }],
  funcionarios: [{ valor: "9", etiqueta: "Dora", detalle: "DOCENTE", total: 0 }],
}

const base: Conjunto = { ...CONJUNTO_VACIO, establecimiento: "100", sede: "203", jornada: "3" }

const funcionarios: Conjunto = {
  ...base,
  tipos: ["FUNCIONARIOS"],
  todosRoles: true,
  seleccionFuncionarios: "TODOS",
}

describe("sinPeriodos (M.1.AGR.5)", () => {
  it("no bloquea un conjunto solo de funcionarios en una sede sin períodos", () => {
    expect(sinPeriodos(funcionarios, sinAnios)).toBe(false)
    expect(sinPeriodos({ ...funcionarios, jornada: TODAS_LAS_JORNADAS }, sinAnios)).toBe(false)
  })

  it("bloquea Estudiantes o Acudientes en esa sede y jornada", () => {
    expect(sinPeriodos({ ...base, tipos: ["ESTUDIANTES"] }, sinAnios)).toBe(true)
    expect(sinPeriodos({ ...funcionarios, tipos: ["ACUDIENTES", "FUNCIONARIOS"] }, sinAnios)).toBe(true)
  })

  it("no bloquea con períodos o sin la jornada elegida", () => {
    const conAnios = { ...sinAnios, anios: [{ valor: "2026", etiqueta: "2026", detalle: null, total: 0 }] }
    expect(sinPeriodos({ ...base, tipos: ["ESTUDIANTES"] }, conAnios)).toBe(false)
    expect(sinPeriodos({ ...base, jornada: "", tipos: ["ESTUDIANTES"] }, sinAnios)).toBe(false)
    expect(sinPeriodos({ ...base, tipos: ["ESTUDIANTES"] }, undefined)).toBe(false)
  })
})

describe("erroresConjunto", () => {
  it("un conjunto de funcionarios no exige año, modalidad, ciclo ni grado", () => {
    expect(erroresConjunto(funcionarios, 1)).toEqual({})
    expect(erroresConjunto({ ...funcionarios, jornada: TODAS_LAS_JORNADAS }, 1)).toEqual({})
  })

  it("Estudiantes exige la cascada académica", () => {
    const e = erroresConjunto({ ...base, tipos: ["ESTUDIANTES"] }, 2)
    expect(Object.keys(e)).toEqual([
      "conjunto-2-poblacion",
      "conjunto-2-anio",
      "conjunto-2-modalidad",
      "conjunto-2-ciclo",
      "conjunto-2-grado",
    ])
  })

  it("sin sede ni jornada los marca primero", () => {
    const e = erroresConjunto({ ...funcionarios, sede: "", jornada: "" }, 1)
    expect(Object.keys(e)).toEqual(["conjunto-1-sede", "conjunto-1-jornada"])
  })
})

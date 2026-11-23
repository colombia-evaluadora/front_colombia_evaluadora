import { describe, expect, it } from "vitest"
import { CONJUNTO_VACIO, type Cascada, type Conjunto } from "@/features/comunicaciones/comunicados/api/comunicado-documento"
import {
  erroresConjunto,
  funcionariosDelConjunto,
  sinPeriodos,
  soloFuncionariosInactivos,
  TODAS_LAS_JORNADAS,
} from "@/features/comunicaciones/comunicados/lib/conjunto"

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

describe("funcionarios inactivos en el EE (Regla 101)", () => {
  const conInactiva: Cascada = {
    ...sinAnios,
    funcionarios: [
      { valor: "9", etiqueta: "Dora", detalle: "DOCENTE", total: 0 },
      { valor: "7", etiqueta: "Melyssa", detalle: "DOCENTE", total: 1 },
      { valor: "7", etiqueta: "Melyssa", detalle: "COORDINADOR", total: 1 },
    ],
  }

  it("separa activos e inactivos, una vez por persona", () => {
    const r = funcionariosDelConjunto(funcionarios, conInactiva)
    expect(r.activos.map((f) => f.valor)).toEqual(["9"])
    expect(r.inactivos.map((f) => f.valor)).toEqual(["7"])
    expect(soloFuncionariosInactivos(funcionarios, conInactiva)).toBe(false)
  })

  it("bloquea solo si todos los elegidos están inactivos", () => {
    const especificos: Conjunto = { ...funcionarios, seleccionFuncionarios: "ESPECIFICOS", funcionarios: ["7"] }
    expect(soloFuncionariosInactivos(especificos, conInactiva)).toBe(true)
    expect(soloFuncionariosInactivos({ ...especificos, funcionarios: ["7", "9"] }, conInactiva)).toBe(false)
  })

  it("sin Funcionarios en los tipos no advierte", () => {
    expect(funcionariosDelConjunto({ ...funcionarios, tipos: ["ESTUDIANTES"] }, conInactiva).inactivos).toEqual([])
  })
})

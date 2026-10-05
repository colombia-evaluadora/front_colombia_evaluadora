import { describe, expect, it } from "vitest"

import type { Adaptacion } from "@/features/planeador/api/types/actividad"
import {
  adaptacionesConEstudiantesDeLaActividad,
  esEstudianteDeLaActividad,
} from "@/features/planeador/lib/adaptacion-estudiantes"

const adaptacion = (estudiantesIds: number[]): Adaptacion => ({
  tipo: "Acceso",
  especificacionTipo: "",
  descripcion: "x",
  versionModificada: "no",
  versionModificadaRef: "",
  nombrePlantilla: "",
  aplicaA: "Estudiantes específicos",
  estudiantesIds,
  archivos: [],
})

describe("esEstudianteDeLaActividad", () => {
  it("con todo el grupo acepta cualquier matrícula", () => {
    expect(esEstudianteDeLaActividad({ asignarTodoElGrupo: true, matriculasIds: [] }, 99)).toBe(true)
  })

  it("con un subconjunto solo acepta las asignadas", () => {
    const actividad = { asignarTodoElGrupo: false, matriculasIds: [1, 2] }
    expect(esEstudianteDeLaActividad(actividad, 2)).toBe(true)
    expect(esEstudianteDeLaActividad(actividad, 3)).toBe(false)
  })
})

describe("adaptacionesConEstudiantesDeLaActividad", () => {
  it("poda los estudiantes que ya no están en la actividad", () => {
    const [resultado] = adaptacionesConEstudiantesDeLaActividad({
      asignarTodoElGrupo: false,
      matriculasIds: [1, 3],
      adaptaciones: [adaptacion([1, 2, 3])],
    })
    expect(resultado.estudiantesIds).toEqual([1, 3])
  })

  it("con todo el grupo no toca la selección", () => {
    const [resultado] = adaptacionesConEstudiantesDeLaActividad({
      asignarTodoElGrupo: true,
      matriculasIds: [],
      adaptaciones: [adaptacion([5, 6])],
    })
    expect(resultado.estudiantesIds).toEqual([5, 6])
  })
})

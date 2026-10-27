import { describe, expect, it } from "vitest"

import type { Actividad, Adaptacion } from "@/features/planeador/api/types/actividad"
import {
  avisoCamposObligatorios,
  camposObligatoriosFaltantes,
  faltaTipoEvidencia,
  faltanEstudiantes,
} from "@/features/planeador/lib/campos-obligatorios-faltantes"
import { crearActividadVacia } from "@/features/planeador/lib/empty-actividad"

const adaptacion = { id: 1 } as unknown as Adaptacion

/** Actividad con todo lo general completo (grupo con "todo el grupo"). */
function completa(patch: Partial<Actividad> = {}): Actividad {
  return {
    ...crearActividadVacia(),
    grupoId: 10,
    asignaturaId: 20,
    nombre: "Lectura en voz alta",
    tipo: "Taller",
    fechaInicio: "2026-10-01",
    fechaCierre: "2026-10-10",
    rotuloEjecucion: "Actividad",
    ...patch,
  }
}

const contexto = {
  camposEfectivos: { evaluacion: { requerido: true } },
  esFormativa: false,
  grupoTieneEstudiantes: true,
}

describe("camposObligatoriosFaltantes", () => {
  it("una actividad vacía lista todos los campos generales, en el orden del form", () => {
    const vacia = { ...crearActividadVacia(), instrumento: "" }
    expect(camposObligatoriosFaltantes(vacia, contexto)).toEqual([
      "Grado / Grupo",
      "Asignatura",
      "Nombre de la actividad",
      "Tipo de actividad",
      "Fecha inicio",
      "Fecha de entrega o cierre",
      "Instrumento de evaluación",
    ])
  })

  it("una actividad completa no tiene faltantes", () => {
    expect(camposObligatoriosFaltantes(completa(), contexto)).toEqual([])
  })

  it("usa el rótulo de la actividad en los nombres", () => {
    const faltantes = camposObligatoriosFaltantes(completa({ nombre: " ", rotuloEjecucion: "Experiencia" }), contexto)
    expect(faltantes).toEqual(["Nombre de la experiencia"])
  })

  it("el instrumento no se exige con referente formativo ni si el referente no lo pide", () => {
    const sinInstrumento = completa({ instrumento: "" })
    expect(camposObligatoriosFaltantes(sinInstrumento, { ...contexto, esFormativa: true })).toEqual([])
    expect(
      camposObligatoriosFaltantes(sinInstrumento, { ...contexto, camposEfectivos: { evaluacion: { requerido: false } } }),
    ).toEqual([])
    expect(camposObligatoriosFaltantes(sinInstrumento, contexto)).toEqual(["Instrumento de evaluación"])
  })

  it("exige estudiantes cuando se destildó a todos y el grupo tiene a quién asignar", () => {
    const ninguno = completa({ asignarTodoElGrupo: false, matriculasIds: [] })
    expect(camposObligatoriosFaltantes(ninguno, contexto)).toEqual(["Estudiantes de la actividad"])
    expect(camposObligatoriosFaltantes(ninguno, { ...contexto, grupoTieneEstudiantes: false })).toEqual([])
  })

  it("exige estudiantes en una adaptación para estudiantes específicos", () => {
    const especifica = { ...adaptacion, aplicaA: "Estudiantes específicos", estudiantesIds: [] } as Adaptacion
    const actividad = completa({ asignarTodoElGrupo: false, matriculasIds: [7], adaptaciones: [especifica] })
    expect(camposObligatoriosFaltantes(actividad, contexto)).toEqual(["Estudiantes de la adaptación 1"])
    const conEstudiante = { ...especifica, estudiantesIds: [7] }
    expect(camposObligatoriosFaltantes({ ...actividad, adaptaciones: [conEstudiante] }, contexto)).toEqual([])
  })

  it("exige tipo de evidencia solo si genera evidencias y Seguimiento está visible", () => {
    const sinTipo = completa({ generaEvidencias: true, tipoEvidencia: "", adaptaciones: [adaptacion] })
    expect(camposObligatoriosFaltantes(sinTipo, contexto)).toEqual(["Tipo de evidencia"])
    // Formativa: Seguimiento no se muestra.
    expect(camposObligatoriosFaltantes(sinTipo, { ...contexto, esFormativa: true })).toEqual([])
  })
})

describe("faltanEstudiantes", () => {
  it("todo el grupo o una selección puntual son válidos", () => {
    expect(faltanEstudiantes(completa({ asignarTodoElGrupo: true, matriculasIds: [] }), true)).toBe(false)
    expect(faltanEstudiantes(completa({ asignarTodoElGrupo: false, matriculasIds: [5] }), true)).toBe(false)
  })

  it("sin grupo elegido no marca estudiantes (ya falta Grado / Grupo)", () => {
    expect(faltanEstudiantes(completa({ grupoId: undefined, asignarTodoElGrupo: false }), true)).toBe(false)
  })
})

describe("faltaTipoEvidencia", () => {
  it("no aplica si no genera evidencias", () => {
    expect(faltaTipoEvidencia(completa({ generaEvidencias: false, adaptaciones: [adaptacion] }), false)).toBe(false)
  })

  it("no aplica sin adaptaciones (Seguimiento oculto)", () => {
    expect(faltaTipoEvidencia(completa({ generaEvidencias: true, adaptaciones: [] }), false)).toBe(false)
  })

  it("con tipo elegido es válido", () => {
    const conTipo = completa({ generaEvidencias: true, tipoEvidencia: "Archivo", adaptaciones: [adaptacion] })
    expect(faltaTipoEvidencia(conTipo, false)).toBe(false)
  })
})

describe("avisoCamposObligatorios", () => {
  it("null si no falta nada", () => {
    expect(avisoCamposObligatorios([], { nombre: "Rúbrica", faltantes: [] })).toBeNull()
  })

  it("solo campos generales", () => {
    expect(avisoCamposObligatorios(["Asignatura", "Fecha inicio"], { nombre: "Rúbrica", faltantes: [] })).toBe(
      "Complete los campos obligatorios: Asignatura, Fecha inicio.",
    )
  })

  it("une campos generales y el instrumento incompleto en un solo aviso", () => {
    const aviso = avisoCamposObligatorios(["Nombre de la actividad"], {
      nombre: "Rúbrica",
      faltantes: ["La rúbrica necesita al menos un criterio."],
    })
    expect(aviso).toBe(
      "Complete los campos obligatorios: Nombre de la actividad, Rúbrica. Rúbrica: La rúbrica necesita al menos un criterio.",
    )
  })

  it("solo el instrumento; el 'Otro' se nombra como instrumento personalizado", () => {
    const aviso = avisoCamposObligatorios([], {
      nombre: "Otro",
      faltantes: ["Indique el método de valoración del instrumento personalizado."],
    })
    expect(aviso).toBe(
      "Complete los campos obligatorios: Instrumento personalizado. Instrumento personalizado: Indique el método de valoración del instrumento personalizado.",
    )
  })
})

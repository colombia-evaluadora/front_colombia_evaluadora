import { describe, expect, it, vi } from "vitest"

// Solo las constantes: el registro real de handlers arrastra el cliente HTTP.
vi.mock("@/features/planeador/offline/saga-handlers", () => ({
  SAGA_KINDS: {
    actividadCrear: "planeador.actividad.crear",
    actividadUnidad: "planeador.actividad.unidad",
    actividadEditar: "planeador.actividad.editar",
    actividadMateriales: "planeador.actividad.materiales",
    actividadInstrumento: "planeador.actividad.instrumento",
    actividadEstudiantes: "planeador.actividad.estudiantes",
    actividadAdaptaciones: "planeador.actividad.adaptaciones",
    actividadCriterio: "planeador.actividad.criterio",
    unidadCrear: "planeador.unidad.crear",
    unidadEditar: "planeador.unidad.editar",
  },
}))
vi.mock("@/features/planeador/api/mutations/update-instrumento-actividad", () => ({
  tieneDefinicionInstrumento: () => true,
}))

import type { Actividad } from "@/features/planeador/api/types/actividad"
import { buildCrearActividadSaga, buildEditarActividadSaga } from "@/features/planeador/offline/build-sagas"
import { fingerprintActividad } from "@/features/planeador/offline/fingerprint"
import { crearActividadVacia } from "@/features/planeador/lib/empty-actividad"

function actividad(over: Partial<Actividad> = {}): Actividad {
  return { ...crearActividadVacia(), id: 12, nombre: "Fracciones", ...over }
}

describe("orden real de la saga (P19)", () => {
  it("crear: actividad → materiales → instrumento → adaptaciones → criterios hermanos", async () => {
    const values = actividad({
      esEvaluativa: true,
      recursos: [{ id: 1, titulo: "Guía", fuente: "", tipo: "URL", url: "https://x", descripcion: "" }],
      adaptaciones: [
        { tipo: "Tiempo", especificacionTipo: "", descripcion: "Más tiempo", versionModificada: "no", versionModificadaRef: "", nombrePlantilla: "", aplicaA: "A todo el grupo", estudiantesIds: [], archivos: [] },
      ],
      criteriosUnidadIds: [5, 6],
    })
    const saga = await buildCrearActividadSaga(values)
    expect(saga.steps.map((s) => s.kind.split(".").at(-1))).toEqual([
      "crear",
      "materiales",
      "instrumento",
      "adaptaciones",
      "criterio",
      "criterio",
    ])
    expect(saga.steps.filter((s) => s.kind.endsWith("criterio")).every((s) => s.after?.[0] === 0)).toBe(true)
    expect(saga.steps.slice(1).every((s) => s.payload.actividadId === saga.tmpId)).toBe(true)
  })

  it("editar: PUT (con la unidad) → materiales → instrumento → estudiantes → adaptaciones, con verificación en el primero", async () => {
    const base = actividad({ unidad: { id: 0, nombre: "" }, matriculasIds: [1], asignarTodoElGrupo: false })
    const values = {
      ...base,
      esEvaluativa: true,
      unidad: { id: 3, nombre: "U" },
      matriculasIds: [1, 2],
      recursos: [{ id: 1, titulo: "Guía", fuente: "", tipo: "URL" as const, url: "https://y", descripcion: "" }],
      adaptaciones: [
        { tipo: "Tiempo", especificacionTipo: "", descripcion: "x", versionModificada: "no" as const, versionModificadaRef: "", nombrePlantilla: "", aplicaA: "A todo el grupo", estudiantesIds: [], archivos: [] },
      ],
    }
    const saga = await buildEditarActividadSaga(values, { actividad: base, unidades: [{ id: 3, metodoCalculo: "Ponderado" }] })
    expect(saga.steps.map((s) => s.kind.split(".").at(-1))).toEqual([
      "editar",
      "materiales",
      "instrumento",
      "estudiantes",
      "adaptaciones",
    ])
    expect(saga.steps[0].payload.check).toEqual({ baseFingerprint: fingerprintActividad(base) })
    expect(saga.steps.slice(1).some((s) => "check" in s.payload)).toBe(false)
  })
})

describe("VERSION del servidor (BE-3B)", () => {
  it("editar asignando unidad (QA 73): UNA sola op, el PUT con la unidad y el check", async () => {
    const base = actividad({ unidad: { id: 0, nombre: "" }, version: 9 })
    const values = { ...base, unidad: { id: 3, nombre: "U" } }
    const saga = await buildEditarActividadSaga(values, { actividad: base, unidades: [{ id: 3, metodoCalculo: "Ponderado" }] })
    expect(saga.steps[0].kind).toBe("planeador.actividad.editar")
    expect(saga.steps[0].payload.check).toEqual({ baseVersion: 9 })
    expect(saga.steps[0].payload.unidadAnteriorId).toBe(0)
    expect(saga.steps.some((s) => s.kind === "planeador.actividad.unidad")).toBe(false)
  })

  it("editar quitando la unidad: sin paso de desvincular aparte", async () => {
    const base = actividad({ unidad: { id: 3, nombre: "U" } })
    const saga = await buildEditarActividadSaga({ ...base, unidad: { id: 0, nombre: "" } }, { actividad: base, unidades: [] })
    expect(saga.steps[0].kind).toBe("planeador.actividad.editar")
    expect(saga.steps.some((s) => s.kind === "planeador.actividad.unidad")).toBe(false)
    expect(saga.steps[0].payload.unidadAnteriorId).toBe(3)
  })

  it("editar sin cambiar la unidad: el PUT es el primer paso y lleva el check", async () => {
    const base = actividad({ version: 4 })
    const saga = await buildEditarActividadSaga({ ...base, nombre: "Otra" }, { actividad: base, unidades: [] })
    expect(saga.steps[0].kind).toBe("planeador.actividad.editar")
    expect(saga.steps[0].payload.check).toEqual({ baseVersion: 4 })
  })
})

describe("huella de versión", () => {
  it("cambia con un campo editable y no con el estado derivado", () => {
    const a = actividad()
    expect(fingerprintActividad({ ...a, status: "completed" })).toBe(fingerprintActividad(a))
    expect(fingerprintActividad({ ...a, nombre: "Otra" })).not.toBe(fingerprintActividad(a))
  })
})

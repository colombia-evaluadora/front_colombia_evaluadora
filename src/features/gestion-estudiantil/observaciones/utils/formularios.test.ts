import { describe, expect, it } from "vitest"

import type { ResumenObservacion } from "@/features/gestion-estudiantil/observaciones/api/types"
import {
  MSG_FECHA_SIN_PERIODO,
  MSG_OBSERVACION_MAX,
  MSG_OBSERVACION_MIN,
  MSG_SIN_DISPONIBLES,
  MSG_SIN_ESTUDIANTES,
  errorObservacion,
  errorPeriodo,
  textoConfirmacion,
  textoPeriodo,
  validarObservacion,
  type ValoresObservacion,
} from "@/features/gestion-estudiantil/observaciones/utils/formularios"

const fila = (extra: Partial<ResumenObservacion> = {}): ResumenObservacion => ({
  fk_tgrupo: 1,
  grado_grupo: "6°A",
  estudiantes: 2,
  fk_tperiodo_evaluacion: 10,
  periodo_nombre: "Período 1",
  periodo_calificable: true,
  ...extra,
})

const valores = (extra: Partial<ValoresObservacion> = {}): ValoresObservacion => ({
  grupos: [1],
  destinatario: "TODO_EL_GRUPO",
  estudiantes: [],
  fecha: new Date(2027, 3, 3),
  titulo: "",
  observacion: "Leer 20 minutos diarios.",
  ...extra,
})

describe("errorObservacion", () => {
  it("usa los mensajes exactos de la especificación", () => {
    expect(errorObservacion("  abc ")).toBe(MSG_OBSERVACION_MIN)
    expect(errorObservacion("a".repeat(1001))).toBe(MSG_OBSERVACION_MAX)
    expect(errorObservacion("abcde")).toBeUndefined()
    expect(errorObservacion("a".repeat(1000))).toBeUndefined()
  })
})

describe("errorPeriodo y textoPeriodo", () => {
  it("no opina sin resumen", () => {
    expect(errorPeriodo(undefined)).toBeUndefined()
    expect(textoPeriodo(undefined)).toBeUndefined()
  })
  it("marca la fecha que no cae en un período de algún grupo", () => {
    const resumen = [fila(), fila({ fk_tgrupo: 2, fk_tperiodo_evaluacion: null, periodo_nombre: null, periodo_calificable: false })]
    expect(errorPeriodo(resumen)).toBe(MSG_FECHA_SIN_PERIODO)
  })
  it("marca el período que no está Calificable", () => {
    expect(errorPeriodo([fila({ periodo_calificable: false })])).toBe("El Período de Evaluación Período 1 no está Calificable.")
  })
  it("nombra el período una vez si es el mismo para todos los grupos", () => {
    expect(textoPeriodo([fila(), fila({ fk_tgrupo: 2, grado_grupo: "6°B" })])).toBe("Período de Evaluación: Período 1.")
  })
  it("con períodos distintos dice el de cada grupo", () => {
    expect(textoPeriodo([fila(), fila({ fk_tgrupo: 2, grado_grupo: "7°B", periodo_nombre: "Período 2" })])).toBe(
      "Período de Evaluación: Período 1 (6°A), Período 2 (7°B).",
    )
  })
})

describe("textoConfirmacion", () => {
  it("suma los estudiantes y enumera los grupos", () => {
    expect(textoConfirmacion([fila()])).toBe("Esta observación se aplicará a 2 estudiantes de 6°A.")
    expect(textoConfirmacion([fila({ estudiantes: 1 })])).toBe("Esta observación se aplicará a 1 estudiante de 6°A.")
    expect(textoConfirmacion([fila(), fila({ grado_grupo: "6°B", estudiantes: 30 }), fila({ grado_grupo: "7°B" })])).toBe(
      "Esta observación se aplicará a 34 estudiantes de 6°A, 6°B y 7°B.",
    )
  })
})

describe("validarObservacion", () => {
  const opciones = { eligeDestino: true, gruposEfectivos: [1], resumen: [fila()] }

  it("acepta una observación completa", () => {
    expect(validarObservacion(valores(), opciones)).toEqual({})
  })
  it("exige grupo, estudiantes, fecha y texto", () => {
    const e = validarObservacion(
      valores({ destinatario: "ESTUDIANTES_ESPECIFICOS", fecha: undefined, observacion: "abc" }),
      { ...opciones, gruposEfectivos: [] },
    )
    expect(e.grupos).toBe("Seleccione al menos un Grado/Grupo.")
    expect(e.estudiantes).toBe(MSG_SIN_ESTUDIANTES)
    expect(e.fecha).toBe("La fecha es obligatoria.")
    expect(e.observacion).toBe(MSG_OBSERVACION_MIN)
  })
  it("avisa del grupo sin estudiantes disponibles", () => {
    expect(validarObservacion(valores(), { ...opciones, resumen: [fila({ estudiantes: 0 })] }).estudiantes).toBe(MSG_SIN_DISPONIBLES)
  })
  it("al modificar no valida el destino", () => {
    const e = validarObservacion(valores({ grupos: null, destinatario: "ESTUDIANTES_ESPECIFICOS" }), {
      eligeDestino: false,
      gruposEfectivos: [],
      resumen: [fila()],
    })
    expect(e).toEqual({})
  })
  it("limita el título a 100 caracteres", () => {
    expect(validarObservacion(valores({ titulo: "a".repeat(101) }), opciones).titulo).toBe("El título no puede superar 100 caracteres.")
  })
})

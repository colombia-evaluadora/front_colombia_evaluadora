import { describe, expect, it } from "vitest"

import type { EntregaEvaluacion, Evaluacion } from "@/features/comunicaciones/chat/api/types"
import { aprobo, notaEntrega } from "@/features/comunicaciones/chat/lib/evaluacion"

const evaluacion: Evaluacion = {
  conversacionId: 1,
  nombre: "E",
  descripcion: "",
  fechaInicio: null,
  fechaCierre: null,
  tiempoLimiteMin: 45,
  puntajeTotal: 100,
  intentos: null,
  mostrarResultados: "AL_CIERRE",
  creadoPor: "Ana",
  esCreador: true,
  preguntas: [
    {
      id: 1,
      tipo: "MULTIPLE",
      texto: "M",
      puntos: 40,
      opciones: [
        { id: 1, texto: "a", correcta: true },
        { id: 2, texto: "b", correcta: true },
        { id: 3, texto: "c", correcta: false },
      ],
    },
    {
      id: 2,
      tipo: "UNICA",
      texto: "U",
      puntos: 30,
      opciones: [
        { id: 4, texto: "x", correcta: true },
        { id: 5, texto: "y", correcta: false },
      ],
    },
    { id: 3, tipo: "REDACCION", texto: "R", puntos: 30, opciones: [] },
  ],
}

const entrega = (opciones: number[][], redaccion: number | null): EntregaEvaluacion => ({
  id: 1,
  estudiante: "Luis",
  estado: "PENDIENTE",
  respuestas: [
    { preguntaId: 1, opcionIds: opciones[0], texto: null, puntos: null },
    { preguntaId: 2, opcionIds: opciones[1], texto: null, puntos: null },
    { preguntaId: 3, opcionIds: [], texto: "…", puntos: redaccion },
  ],
})

describe("notaEntrega", () => {
  it("suma las correctas y la redacción calificada", () => {
    expect(notaEntrega(evaluacion, entrega([[1, 2], [4]], 20))).toBe(90)
  })

  it("múltiple con una correcta de más o de menos no suma", () => {
    expect(notaEntrega(evaluacion, entrega([[1], [4]], null))).toBe(30)
    expect(notaEntrega(evaluacion, entrega([[1, 2, 3], [5]], null))).toBe(0)
  })

  it("la calificación manual reemplaza la guardada", () => {
    expect(notaEntrega(evaluacion, entrega([[], []], 10), { 3: 30 })).toBe(30)
  })
})

describe("aprobo", () => {
  it("aprueba desde el 60 %", () => {
    expect(aprobo(60, 100)).toBe(true)
    expect(aprobo(59, 100)).toBe(false)
  })
})

import { describe, expect, it } from "vitest"

import type { Evaluacion } from "@/features/comunicaciones/chat/api/types"
import { entregas } from "@/mocks/db/comunicaciones-evaluaciones"
import { vistaEstudiante } from "@/mocks/handlers/comunicaciones-evaluaciones"

// Como comms-service: el estudiante nunca recibe resultados detallados, solo la nota calificada.
describe("vistaEstudiante (evaluación en línea)", () => {
  const e: Evaluacion = {
    conversacionId: 9_999,
    nombre: "Quiz",
    descripcion: "",
    fechaInicio: null,
    fechaCierre: null,
    tiempoLimiteMin: null,
    puntajeTotal: 100,
    intentos: null,
    mostrarResultados: "INMEDIATO",
    preguntas: [
      { id: 1, tipo: "UNICA", texto: "1+1", puntos: 60, opciones: [{ id: 1, texto: "2", correcta: true }, { id: 2, texto: "3", correcta: false }] },
      { id: 2, tipo: "REDACCION", texto: "Explica", puntos: 40, opciones: [] },
    ],
    creadoPor: "Docente",
    esCreador: true,
    intentosUsados: 0,
    miNota: null,
    miNotaPendiente: false,
  }
  entregas.set(e.conversacionId, [
    { id: 1, estudiante: "Sofi", estado: "CALIFICADA", respuestas: [{ preguntaId: 1, opcionIds: [1], texto: null, puntos: null }, { preguntaId: 2, opcionIds: [], texto: "x", puntos: 30 }] },
    { id: 2, estudiante: "Sofi", estado: "PENDIENTE", respuestas: [{ preguntaId: 1, opcionIds: [2], texto: null, puntos: null }] },
  ])

  it("sin correctas, puntos por pregunta ni modo de resultados", () => {
    const v = vistaEstudiante(e, "Sofi")
    expect(v.preguntas.flatMap((p) => p.opciones).some((o) => o.correcta)).toBe(false)
    expect(v.preguntas.every((p) => p.puntos == null)).toBe(true)
    expect(v.mostrarResultados).toBeNull()
  })

  it("por intento solo la nota calificada; el pendiente sin nota aunque sea INMEDIATO", () => {
    const v = vistaEstudiante(e, "Sofi")
    expect(v.misIntentos).toEqual([
      { numero: 1, estado: "CALIFICADA", nota: 90 },
      { numero: 2, estado: "PENDIENTE", nota: null },
    ])
    expect(v.miNota).toBeNull()
    expect(v.miNotaPendiente).toBe(true)
  })
})

import { describe, expect, it } from "vitest"

import type { Encuesta } from "@/features/comunicaciones/chat/api/types"
import { resumenEncuesta } from "@/features/comunicaciones/chat/lib/encuesta"

const base: Encuesta = {
  conversacionId: 1,
  nombre: "E",
  descripcion: "",
  fechaInicio: null,
  fechaCierre: null,
  resultados: "PUBLICOS",
  totalHabilitados: 200,
  participantes: 100,
  creadoPor: "Ana",
  esCreador: true,
  preguntas: [
    {
      id: 1,
      tipo: "UNICA",
      texto: "A",
      totalRespuestas: 100,
      respuestas: [],
      opciones: [
        { id: 1, texto: "Sí", votos: 30 },
        { id: 2, texto: "No", votos: 70 },
      ],
    },
    { id: 2, tipo: "REDACCION", texto: "B", totalRespuestas: 40, respuestas: [], opciones: [] },
  ],
}

describe("resumenEncuesta", () => {
  it("calcula participación, respuesta y pregunta con más respuestas", () => {
    expect(resumenEncuesta(base)).toEqual({ participacion: 50, respuestaTop: "No", preguntaTop: 0 })
  })

  it("sin respuestas no destaca nada", () => {
    expect(resumenEncuesta({ ...base, participantes: 0, preguntas: [] })).toEqual({
      participacion: 0,
      respuestaTop: null,
      preguntaTop: null,
    })
  })
})

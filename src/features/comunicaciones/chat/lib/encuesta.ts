import type { Encuesta, PreguntaEncuesta } from "@/features/comunicaciones/chat/api/types"
import { porcentaje } from "@/features/comunicaciones/chat/lib/eleccion"

export const OPCIONES_SI_NO = ["Sí", "No"]

// Las de redacción no tienen opciones; las de SI/NO las trae fijas.
export const tieneOpciones = (p: Pick<PreguntaEncuesta, "tipo">) =>
  p.tipo === "MULTIPLE" || p.tipo === "UNICA"

export interface ResumenEncuesta {
  participacion: number
  respuestaTop: string | null
  // Índice 0-based de la pregunta con más respuestas.
  preguntaTop: number | null
}

export function resumenEncuesta(e: Encuesta): ResumenEncuesta {
  let respuestaTop: string | null = null
  let mejorPct = -1
  let preguntaTop: number | null = null
  let masRespuestas = 0
  e.preguntas.forEach((p, i) => {
    if (p.totalRespuestas > masRespuestas) {
      masRespuestas = p.totalRespuestas
      preguntaTop = i
    }
    for (const o of p.opciones) {
      const pct = porcentaje(o.votos, p.totalRespuestas)
      if (pct > mejorPct) {
        mejorPct = pct
        respuestaTop = o.texto
      }
    }
  })
  return {
    participacion: porcentaje(e.participantes, e.totalHabilitados),
    respuestaTop,
    preguntaTop,
  }
}

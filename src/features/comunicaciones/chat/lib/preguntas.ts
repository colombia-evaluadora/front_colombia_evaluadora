import type { TipoPregunta } from "@/features/comunicaciones/chat/api/types"
import { tieneOpciones } from "@/features/comunicaciones/chat/lib/encuesta"

// Preguntas en edición que comparten la encuesta y la evaluación en línea. En la
// evaluación cada pregunta lleva puntuación y se marcan las respuestas correctas.
export type ModoPreguntas = "ENCUESTA" | "EVALUACION"

export interface OpcionLocal {
  clave: number
  texto: string
  correcta: boolean
}

export interface PreguntaLocal {
  clave: number
  tipo: TipoPregunta
  texto: string
  opciones: OpcionLocal[]
  // Texto para no pelear con el input; se convierte al enviar.
  puntos: string
}

export const MIN_OPCIONES = 2
export const OPCIONES_VERDADERO_FALSO = ["Verdadero", "Falso"]

let siguienteClave = 1
export const nuevaClave = () => siguienteClave++
export const opcion = (texto = ""): OpcionLocal => ({ clave: nuevaClave(), texto, correcta: false })

// Verdadero/Falso de la evaluación se guarda como dos opciones fijas para
// poder marcar cuál es la correcta igual que en las demás.
export const opcionesIniciales = (tipo: TipoPregunta, modo: ModoPreguntas) =>
  tieneOpciones({ tipo })
    ? [opcion(), opcion()]
    : tipo === "SI_NO" && modo === "EVALUACION"
      ? OPCIONES_VERDADERO_FALSO.map((t) => opcion(t))
      : []

export const nuevaPregunta = (tipo: TipoPregunta, modo: ModoPreguntas): PreguntaLocal => ({
  clave: nuevaClave(),
  tipo,
  texto: "",
  opciones: opcionesIniciales(tipo, modo),
  puntos: "",
})

export const duplicarPregunta = (p: PreguntaLocal): PreguntaLocal => ({
  ...p,
  clave: nuevaClave(),
  opciones: p.opciones.map((o) => ({ ...o, clave: nuevaClave() })),
})

export const conCorrectas = (p: Pick<PreguntaLocal, "tipo">, modo: ModoPreguntas) =>
  modo === "EVALUACION" && p.tipo !== "REDACCION"

// Primer problema de la pregunta, o null si está lista.
export function errorPregunta(p: PreguntaLocal, modo: ModoPreguntas): string | null {
  if (!p.texto.trim()) return "Escribe la pregunta."
  if (tieneOpciones(p)) {
    if (p.opciones.length < MIN_OPCIONES) return `Agrega al menos ${MIN_OPCIONES} opciones.`
    if (p.opciones.some((o) => !o.texto.trim())) return "Completa o elimina las opciones vacías."
  }
  if (modo === "EVALUACION") {
    if (!(Number(p.puntos) > 0)) return "Asigna la puntuación."
    if (conCorrectas(p, modo) && !p.opciones.some((o) => o.correcta)) {
      return "Marca la respuesta correcta."
    }
  }
  return null
}

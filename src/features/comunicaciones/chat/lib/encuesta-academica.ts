import type { Encuesta } from "@/features/comunicaciones/chat/api/types"
import { estadoEleccion } from "@/features/comunicaciones/chat/lib/eleccion"

// Modalidad del manual de espacios académicos (Sección 8): una pregunta, de 2 a 10 opciones, no
// anónima y con respuesta modificable hasta el cierre. La modalidad institucional no pasa por aquí.
export const MIN_OPCIONES = 2
export const MAX_OPCIONES = 10
export const MAX_PREGUNTA = 500
export const MAX_OPCION = 150

// Mismo texto en el aviso previo a responder y en el formulario de creación.
export const AVISO_NO_ANONIMA =
  "Esta encuesta no es anónima: quien la gestiona puede ver tu respuesta. El resto ve solo resultados agregados."

export interface OpcionesInvalidas {
  general?: string
  // Por posición.
  porOpcion: Record<number, string>
}

export function validarOpciones(opciones: string[]): OpcionesInvalidas {
  const porOpcion: Record<number, string> = {}
  opciones.forEach((o, i) => {
    if (!o.trim()) porOpcion[i] = "Escribe el texto de la opción."
    else if (o.trim().length > MAX_OPCION) porOpcion[i] = `Máximo ${MAX_OPCION} caracteres.`
  })
  const general =
    opciones.length < MIN_OPCIONES || opciones.length > MAX_OPCIONES
      ? `La pregunta lleva de ${MIN_OPCIONES} a ${MAX_OPCIONES} opciones.`
      : undefined
  return { general, porOpcion }
}

export const opcionesValidas = (opciones: string[]) => {
  const r = validarOpciones(opciones)
  return !r.general && Object.keys(r.porOpcion).length === 0
}

// Abierta en modalidad ACADEMICA: el formulario sigue disponible aunque ya haya respondido.
export const academicaAbierta = (e: Encuesta) => e.modalidad === "ACADEMICA" && estadoEleccion(e) === "ACTIVA"

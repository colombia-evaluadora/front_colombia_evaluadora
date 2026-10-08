import type {
  EntregaEvaluacion,
  Evaluacion,
  PreguntaEvaluacion,
  RespuestaEntrega,
} from "@/features/comunicaciones/chat/api/types"

// Las preguntas con opciones se califican solas; la redacción la califica el docente.
export const esAutomatica = (p: Pick<PreguntaEvaluacion, "tipo">) => p.tipo !== "REDACCION"

// Selección múltiple solo suma si marcó exactamente las correctas (sin puntaje parcial).
export function esCorrecta(p: PreguntaEvaluacion, r: RespuestaEntrega | undefined) {
  if (!r) return false
  const correctas = p.opciones.filter((o) => o.correcta).map((o) => o.id)
  return (
    correctas.length === r.opcionIds.length && correctas.every((id) => r.opcionIds.includes(id))
  )
}

export function puntosPregunta(
  p: PreguntaEvaluacion,
  r: RespuestaEntrega | undefined,
  manual?: number | null,
) {
  if (esAutomatica(p)) return esCorrecta(p, r) ? p.puntos : 0
  return manual ?? r?.puntos ?? 0
}

export function notaEntrega(
  e: Evaluacion,
  entrega: EntregaEvaluacion,
  manual: Record<number, number | null> = {},
) {
  const porPregunta = new Map(entrega.respuestas.map((r) => [r.preguntaId, r]))
  return e.preguntas.reduce(
    (s, p) => s + puntosPregunta(p, porPregunta.get(p.id), manual[p.id]),
    0,
  )
}

// Aprobado desde el 60 % del puntaje total.
export const UMBRAL_APROBACION = 0.6
export const aprobo = (nota: number, total: number) => total > 0 && nota >= total * UMBRAL_APROBACION

export const formatoTiempo = (min: number | null) =>
  min == null ? "Sin límite" : min < 60 ? `${min} minutos` : `${min / 60} h`

export const formatoIntentos = (n: number | null) => (n == null ? "Ilimitado" : String(n))

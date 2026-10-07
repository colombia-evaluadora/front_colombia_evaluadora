import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type {
  Conversacion,
  EntregaEvaluacion,
  MostrarResultados,
  TipoPregunta,
} from "@/features/comunicaciones/chat/api/types"

export interface PreguntaEvaluacionNueva {
  tipo: TipoPregunta
  texto: string
  puntos: number
  opciones: Array<{ texto: string; correcta: boolean }>
}

export interface CrearEvaluacionInput {
  nombre: string
  descripcion: string
  fechaInicio: string | null
  fechaCierre: string | null
  tiempoLimiteMin: number | null
  puntajeTotal: number
  intentos: number | null
  mostrarResultados: MostrarResultados
  preguntas: PreguntaEvaluacionNueva[]
}

const sn = (v: boolean) => (v ? "S" : "N")

export function useCrearEvaluacion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: CrearEvaluacionInput) =>
      evalCol.postRow<Conversacion>("/comunicaciones/evaluaciones", {
        NOMBRE: v.nombre,
        DESCRIPCION: v.descripcion,
        FECHA_INICIO: v.fechaInicio,
        FECHA_CIERRE: v.fechaCierre,
        TIEMPO_LIMITE_MIN: v.tiempoLimiteMin,
        PUNTAJE_TOTAL: v.puntajeTotal,
        INTENTOS: v.intentos,
        MOSTRAR_RESULTADOS: v.mostrarResultados,
        PREGUNTAS: v.preguntas.map((p, i) => ({
          ORDEN: i + 1,
          TIPO: p.tipo,
          TEXTO: p.texto,
          PUNTOS: p.puntos,
          OPCIONES: p.opciones.map((o) => ({ TEXTO: o.texto, CORRECTA: sn(o.correcta) })),
        })),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones }),
  })
}

// Guarda los puntos de las preguntas de redacción y cierra la calificación.
export function useCalificarEntrega(conversacionId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ entregaId, puntos }: { entregaId: number; puntos: Record<number, number> }) =>
      evalCol.patchRow<EntregaEvaluacion>(`/comunicaciones/evaluaciones/entregas/${entregaId}`, {
        CALIFICACIONES: Object.entries(puntos).map(([preguntaId, p]) => ({
          FK_PREGUNTA: Number(preguntaId),
          PUNTOS: p,
        })),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.entregas(conversacionId) }),
  })
}

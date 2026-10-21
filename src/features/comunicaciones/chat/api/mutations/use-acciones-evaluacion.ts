import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type {
  Conversacion,
  EntregaEvaluacion,
  Evaluacion,
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
  // Ids (users) de quienes la presentan; comms-service los vuelve miembros del canal.
  participantes: number[]
}

const sn = (v: boolean) => (v ? "S" : "N")

const cuerpoEvaluacion = (v: Omit<CrearEvaluacionInput, "participantes">) => ({
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
})

export function useCrearEvaluacion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: CrearEvaluacionInput) =>
      evalCol.postRow<Conversacion>("/comunicaciones/evaluaciones", {
        ...cuerpoEvaluacion(v),
        PARTICIPANTES: v.participantes,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones }),
  })
}

/**
 * "Editar Evaluación" (diseño 4062:67466): comms-service lo permite a quien la creó y antes de la
 * primera entrega (409 si no). Los participantes no cambian.
 */
export function useEditarEvaluacion(conversacionId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: Omit<CrearEvaluacionInput, "participantes">) =>
      evalCol.patchRow<Evaluacion>(`/comunicaciones/conversaciones/${conversacionId}/evaluacion`, cuerpoEvaluacion(v)),
    onSuccess: (evaluacion) => {
      queryClient.setQueryData(chatKeys.evaluacion(conversacionId), evaluacion)
      return queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones })
    },
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

export interface RespuestaNueva {
  preguntaId: number
  opcionIds: number[]
  texto: string | null
}

// Entrega del estudiante; devuelve la evaluación con su avance (intentos y nota).
export function useEnviarEvaluacion(conversacionId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (respuestas: RespuestaNueva[]) =>
      evalCol.postRow<Evaluacion>(`/comunicaciones/conversaciones/${conversacionId}/evaluacion/entregas`, {
        RESPUESTAS: respuestas.map((r) => ({ FK_PREGUNTA: r.preguntaId, OPCIONES: r.opcionIds, TEXTO: r.texto })),
      }),
    onSuccess: (evaluacion) => {
      queryClient.setQueryData(chatKeys.evaluacion(conversacionId), evaluacion)
      return queryClient.invalidateQueries({ queryKey: chatKeys.entregas(conversacionId) })
    },
  })
}

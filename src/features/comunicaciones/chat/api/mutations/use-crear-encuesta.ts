import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type {
  Conversacion,
  Encuesta,
  TipoPregunta,
  VisibilidadResultados,
} from "@/features/comunicaciones/chat/api/types"

export interface PreguntaNueva {
  tipo: TipoPregunta
  texto: string
  opciones: string[]
}

export interface CrearEncuestaInput {
  nombre: string
  descripcion: string
  fechaInicio: string | null
  fechaCierre: string | null
  resultados: VisibilidadResultados
  // Ids (users) de quienes responden; comms-service los vuelve miembros del canal.
  participantes: number[]
  preguntas: PreguntaNueva[]
}

const cuerpoEncuesta = (v: Omit<CrearEncuestaInput, "participantes">) => ({
    NOMBRE: v.nombre,
    DESCRIPCION: v.descripcion,
    FECHA_INICIO: v.fechaInicio,
    FECHA_CIERRE: v.fechaCierre,
    RESULTADOS: v.resultados,
    PREGUNTAS: v.preguntas.map((p, i) => ({
      ORDEN: i + 1,
      TIPO: p.tipo,
      TEXTO: p.texto,
      OPCIONES: p.opciones,
    })),
})

async function crearEncuesta(v: CrearEncuestaInput) {
  return evalCol.postRow<Conversacion>("/comunicaciones/encuestas", {
    ...cuerpoEncuesta(v),
    PARTICIPANTES: v.participantes,
  })
}

/**
 * "Editar Encuesta" (diseño 4060:63421): comms-service lo permite a quien la creó y mientras nadie
 * la haya respondido (409 si no). Los participantes no cambian.
 */
export function useEditarEncuesta(conversacionId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: Omit<CrearEncuestaInput, "participantes">) =>
      evalCol.patchRow<Encuesta>(`/comunicaciones/conversaciones/${conversacionId}/encuesta`, cuerpoEncuesta(v)),
    onSuccess: (encuesta) => {
      queryClient.setQueryData(chatKeys.encuesta(conversacionId), encuesta)
      return queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones })
    },
  })
}

export function useCrearEncuesta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: crearEncuesta,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones }),
  })
}

// Respuestas de la persona asignada; devuelve la encuesta con los conteos al día.
export function useResponderEncuesta(conversacionId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (respuestas: Array<{ preguntaId: number; opcionIds: number[]; texto: string | null }>) =>
      evalCol.postRow<Encuesta>(`/comunicaciones/conversaciones/${conversacionId}/encuesta/respuestas`, {
        RESPUESTAS: respuestas.map((r) => ({ FK_PREGUNTA: r.preguntaId, OPCIONES: r.opcionIds, TEXTO: r.texto })),
      }),
    onSuccess: (encuesta) => queryClient.setQueryData(chatKeys.encuesta(conversacionId), encuesta),
  })
}

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
  preguntas: PreguntaNueva[]
}

async function crearEncuesta(v: CrearEncuestaInput) {
  return evalCol.postRow<Conversacion>("/comunicaciones/encuestas", {
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

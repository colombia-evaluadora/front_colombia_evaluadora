import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type {
  Conversacion,
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

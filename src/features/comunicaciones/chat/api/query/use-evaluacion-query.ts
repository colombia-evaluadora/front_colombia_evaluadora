import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { EntregaEvaluacion, Evaluacion } from "@/features/comunicaciones/chat/api/types"

const base = (id: number) => `/comunicaciones/conversaciones/${id}/evaluacion`

export function useEvaluacionQuery(conversacionId: number | undefined) {
  return useQuery({
    queryKey: chatKeys.evaluacion(conversacionId ?? "none"),
    queryFn: async () => {
      const [row] = await evalCol.getRows<Evaluacion>(base(conversacionId as number))
      return row ?? null
    },
    enabled: Boolean(conversacionId),
  })
}

export function useEntregasQuery(conversacionId: number | undefined) {
  return useQuery({
    queryKey: chatKeys.entregas(conversacionId ?? "none"),
    queryFn: () => evalCol.getRows<EntregaEvaluacion>(`${base(conversacionId as number)}/entregas`),
    enabled: Boolean(conversacionId),
  })
}

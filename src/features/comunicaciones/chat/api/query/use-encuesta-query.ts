import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Encuesta } from "@/features/comunicaciones/chat/api/types"
import { estadoEleccion } from "@/features/comunicaciones/chat/lib/eleccion"

// Mientras está abierta se refresca para ver llegar las respuestas.
const REFRESCO_MS = 10_000

async function fetchEncuesta(conversacionId: number) {
  const [row] = await evalCol.getRows<Encuesta>(
    `/comunicaciones/conversaciones/${conversacionId}/encuesta`,
  )
  return row ?? null
}

export function useEncuestaQuery(conversacionId: number | undefined) {
  return useQuery({
    queryKey: chatKeys.encuesta(conversacionId ?? "none"),
    queryFn: () => fetchEncuesta(conversacionId as number),
    enabled: Boolean(conversacionId),
    refetchInterval: (query) =>
      query.state.data && estadoEleccion(query.state.data) === "ACTIVA" ? REFRESCO_MS : false,
  })
}

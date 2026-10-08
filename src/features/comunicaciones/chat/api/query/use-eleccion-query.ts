import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Eleccion } from "@/features/comunicaciones/chat/api/types"
import { estadoEleccion } from "@/features/comunicaciones/chat/lib/eleccion"

// Mientras la votación está abierta se refresca sola para ver el conteo en vivo.
const REFRESCO_MS = 10_000

async function fetchEleccion(conversacionId: number) {
  const [row] = await evalCol.getRows<Eleccion>(
    `/comunicaciones/conversaciones/${conversacionId}/eleccion`,
  )
  return row ?? null
}

export function useEleccionQuery(conversacionId: number | undefined) {
  return useQuery({
    queryKey: chatKeys.eleccion(conversacionId ?? "none"),
    // `enabled` garantiza que hay id.
    queryFn: () => fetchEleccion(conversacionId as number),
    enabled: Boolean(conversacionId),
    refetchInterval: (query) =>
      query.state.data && estadoEleccion(query.state.data) === "ACTIVA" ? REFRESCO_MS : false,
  })
}

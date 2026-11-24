import { TTL_OFFLINE, offlineMeta } from "@/lib/offline/query-meta"
import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Comunicado } from "@/features/comunicaciones/chat/api/types"
import { CHAT_FUNCIONES } from "@/features/comunicaciones/chat/lib/funciones-disponibles"

/** Ojo: a quien no lo creó, este GET lo marca leído la primera vez (comms-service). */
export async function fetchComunicado(conversacionId: number) {
  const [row] = await evalCol.getRows<Comunicado>(`/comunicaciones/conversaciones/${conversacionId}/comunicado`)
  return row ?? null
}

export function useComunicadoQuery(conversacionId: number | undefined) {
  return useQuery({
    queryKey: chatKeys.comunicado(conversacionId ?? "none"),
    meta: offlineMeta(TTL_OFFLINE.detalle),
    queryFn: () => fetchComunicado(conversacionId as number),
    enabled: CHAT_FUNCIONES.comunicados && Boolean(conversacionId),
  })
}

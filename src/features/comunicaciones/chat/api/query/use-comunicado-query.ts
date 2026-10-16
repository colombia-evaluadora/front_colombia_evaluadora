import { TTL_OFFLINE, offlineMeta } from "@/lib/offline/query-meta"
import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Comunicado } from "@/features/comunicaciones/chat/api/types"
import { CHAT_FUNCIONES } from "@/features/comunicaciones/chat/lib/funciones-disponibles"

export function useComunicadoQuery(conversacionId: number | undefined) {
  return useQuery({
    queryKey: chatKeys.comunicado(conversacionId ?? "none"),
    meta: offlineMeta(TTL_OFFLINE.detalle),
    queryFn: async () => {
      const [row] = await evalCol.getRows<Comunicado>(
        `/comunicaciones/conversaciones/${conversacionId as number}/comunicado`,
      )
      return row ?? null
    },
    enabled: CHAT_FUNCIONES.comunicados && Boolean(conversacionId),
  })
}

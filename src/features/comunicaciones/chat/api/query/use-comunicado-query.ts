import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Comunicado } from "@/features/comunicaciones/chat/api/types"

export function useComunicadoQuery(conversacionId: number | undefined) {
  return useQuery({
    queryKey: chatKeys.comunicado(conversacionId ?? "none"),
    queryFn: async () => {
      const [row] = await evalCol.getRows<Comunicado>(
        `/comunicaciones/conversaciones/${conversacionId as number}/comunicado`,
      )
      return row ?? null
    },
    enabled: Boolean(conversacionId),
  })
}

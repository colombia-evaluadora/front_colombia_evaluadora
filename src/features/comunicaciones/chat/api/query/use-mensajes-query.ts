import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Mensaje } from "@/features/comunicaciones/chat/api/types"

async function fetchMensajes(conversacionId: number) {
  return evalCol.getRows<Mensaje>(`/comunicaciones/conversaciones/${conversacionId}/mensajes`)
}

export function useMensajesQuery(conversacionId: number | undefined) {
  return useQuery({
    queryKey: chatKeys.mensajes(conversacionId ?? "none"),
    // `enabled` garantiza que hay id.
    queryFn: () => fetchMensajes(conversacionId as number),
    enabled: Boolean(conversacionId),
  })
}

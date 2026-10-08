import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Miembro } from "@/features/comunicaciones/chat/api/types"

export function useMiembrosQuery(conversacionId: number | undefined) {
  return useQuery({
    queryKey: chatKeys.miembros(conversacionId ?? "none"),
    queryFn: () => evalCol.getRows<Miembro>(`/comunicaciones/conversaciones/${conversacionId}/miembros`),
    enabled: Boolean(conversacionId),
  })
}

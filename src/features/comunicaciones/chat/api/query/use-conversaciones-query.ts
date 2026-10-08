import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Conversacion } from "@/features/comunicaciones/chat/api/types"

// TODO: ajustar ruta y mapeo cuando exista el backend (hoy solo MSW).
async function fetchConversaciones() {
  return evalCol.getRows<Conversacion>("/comunicaciones/conversaciones")
}

export function useConversacionesQuery() {
  return useQuery({
    queryKey: chatKeys.conversaciones,
    queryFn: fetchConversaciones,
  })
}

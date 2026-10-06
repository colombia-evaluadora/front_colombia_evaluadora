import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { ChatInstitucion } from "@/features/comunicaciones/chat/api/types"

async function fetchInstitucion() {
  const [row] = await evalCol.getRows<ChatInstitucion>("/comunicaciones/institucion")
  return row ?? null
}

export function useInstitucionQuery() {
  return useQuery({
    queryKey: chatKeys.institucion,
    queryFn: fetchInstitucion,
    staleTime: Infinity,
  })
}

import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Persona } from "@/features/comunicaciones/chat/api/types"

// Directorio del colegio para añadir personas a un canal.
export function usePersonasQuery(enabled = true) {
  return useQuery({
    queryKey: chatKeys.personas,
    queryFn: () => evalCol.getRows<Persona>("/comunicaciones/personas"),
    enabled,
    staleTime: 5 * 60_000,
  })
}

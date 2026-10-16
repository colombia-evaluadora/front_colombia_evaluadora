import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { PoliticaChat } from "@/features/comunicaciones/chat/lib/politica-chat"

// La política la configura la institución (pendiente de aprobación, PLAN §6):
// el front no la asume, la pide. Hoy solo existe en MSW.
export function usePoliticaChatQuery() {
  return useQuery({
    queryKey: chatKeys.politica,
    queryFn: async () => (await evalCol.getRows<PoliticaChat>("/comunicaciones/politica"))[0] ?? null,
    staleTime: Infinity,
  })
}

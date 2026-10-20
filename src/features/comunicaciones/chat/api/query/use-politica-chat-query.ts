import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import { catalogoMeta } from "@/lib/offline/query-meta"
import type { PoliticaChat } from "@/features/comunicaciones/chat/lib/politica-chat"

// La política la configura la institución (pendiente de aprobación, PLAN §6):
// el front no la asume, la pide. Hoy solo existe en MSW.
export async function fetchPoliticaChat(): Promise<PoliticaChat | null> {
  return (await evalCol.getRows<PoliticaChat>("/comunicaciones/politica"))[0] ?? null
}

export function usePoliticaChatQuery() {
  return useQuery({
    // Decide qué funciones del chat y los foros se muestran: se guarda para
    // que sin red la pantalla no quede incompleta.
    meta: catalogoMeta(),
    queryKey: chatKeys.politica,
    queryFn: fetchPoliticaChat,
    staleTime: Infinity,
  })
}

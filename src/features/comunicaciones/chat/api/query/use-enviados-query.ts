import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Enviado, TipoEnviado } from "@/features/comunicaciones/chat/api/types"

// Bandeja "Enviados" (comms-service `GET /comunicaciones/enviados`): mensajes
// propios y actividades publicadas, del más nuevo al más viejo.
async function fetchEnviados(tipo: TipoEnviado | undefined) {
  const q = tipo ? `?tipo=${tipo}` : ""
  return evalCol.getRows<Enviado>(`/comunicaciones/enviados${q}`)
}

export function useEnviadosQuery(tipo: TipoEnviado | undefined, enabled = true) {
  return useQuery({
    queryKey: chatKeys.enviados(tipo ?? "TODOS"),
    queryFn: () => fetchEnviados(tipo),
    enabled,
    placeholderData: (prev) => prev,
  })
}

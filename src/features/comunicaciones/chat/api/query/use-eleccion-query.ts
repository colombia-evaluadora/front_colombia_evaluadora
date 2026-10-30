import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Eleccion } from "@/features/comunicaciones/chat/api/types"
import { CHAT_FUNCIONES } from "@/features/comunicaciones/chat/lib/funciones-disponibles"

async function fetchEleccion(conversacionId: number) {
  const [row] = await evalCol.getRows<Eleccion>(
    `/comunicaciones/conversaciones/${conversacionId}/eleccion`,
  )
  return row ?? null
}

export function useEleccionQuery(conversacionId: number | undefined) {
  return useQuery({
    queryKey: chatKeys.eleccion(conversacionId ?? "none"),
    // `enabled` garantiza que hay id.
    queryFn: () => fetchEleccion(conversacionId as number),
    enabled: CHAT_FUNCIONES.elecciones && Boolean(conversacionId),
    // Sin sondeo: no hay resultados en vivo (el servidor no manda conteos con la elección
    // abierta). Se vuelve a pedir solo al cerrar: `EleccionEstado` al llegar a cero y el
    // evento `actividad.actualizada` que emite el cierre (manual o por fecha).
  })
}

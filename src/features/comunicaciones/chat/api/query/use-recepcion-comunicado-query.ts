import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { RecepcionComunicado } from "@/features/comunicaciones/chat/api/types"

/**
 * Registro de recepción del comunicado (solo quien lo publicó): cada destinatario con su estado de
 * lectura y la hora en que lo vio. Se refresca en vivo con `actividad.actualizada` (su key cuelga
 * de la del comunicado).
 */
export function useRecepcionComunicadoQuery(conversacionId: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: chatKeys.recepcion(conversacionId ?? "none"),
    queryFn: () =>
      evalCol.getRows<RecepcionComunicado>(`/comunicaciones/conversaciones/${conversacionId as number}/comunicado/recepcion`),
    enabled: enabled && Boolean(conversacionId),
  })
}

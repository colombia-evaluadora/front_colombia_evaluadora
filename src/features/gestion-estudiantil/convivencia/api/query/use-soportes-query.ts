import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { SoporteAccion } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { convivenciaKeys } from "@/features/gestion-estudiantil/convivencia/api/query-keys"

/** `GET /acciones/:ID/soportes`: historial de soportes de una acción (vigentes, sustituidos y retirados). */
export function useSoportesAccionQuery(accion: number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: convivenciaKeys.soportes(accion ?? "none"),
    queryFn: () => evalCol.getRows<SoporteAccion>(`/gestion-estudiantil/convivencia/acciones/${accion}/soportes`),
    enabled: accion != null && enabled,
  })
}

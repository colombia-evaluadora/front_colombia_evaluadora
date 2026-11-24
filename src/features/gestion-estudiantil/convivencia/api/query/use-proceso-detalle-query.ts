import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { procesosKeys } from "@/features/gestion-estudiantil/convivencia/api/query-keys"
import type { ProcesoDetalle } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"

export const fetchProcesoDetalle = (id: number) =>
  evalCol
    .getRow<{ proceso: ProcesoDetalle }>(`/gestion-estudiantil/convivencia/procesos/${id}`)
    .then((r) => r.proceso)

/** `GET /procesos/:ID` (§3): el backend devuelve `{ proceso: {...} }` en la fila. `enabled` deja al modal pedirlo solo cuando se abre. */
export function useProcesoDetalleQuery(id: number, enabled = true) {
  return useQuery({
    queryKey: procesosKeys.detalle(id),
    queryFn: () => fetchProcesoDetalle(id),
    enabled: enabled && Number.isFinite(id),
  })
}

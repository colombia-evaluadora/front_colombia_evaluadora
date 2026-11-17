import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { reintegracionKeys } from "@/features/gestion-estudiantil/reintegracion/api/query-keys"
import { BASE_REINTEGRACION } from "@/features/gestion-estudiantil/reintegracion/api/query/use-casos-query"
import type { PermisosReintegracion } from "@/features/gestion-estudiantil/reintegracion/api/types"

/** `GET /permisos`: `puede_abrir` decide el botón «+ Abrir caso». */
export function usePermisosReintegracionQuery(establecimiento: number | null) {
  return useQuery({
    queryKey: reintegracionKeys.permisos(establecimiento ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<PermisosReintegracion>(`${BASE_REINTEGRACION}/permisos${queryString({ ESTABLECIMIENTO: establecimiento })}`)
        .then((r) => r[0] ?? { puede_abrir: false }),
    enabled: establecimiento != null,
    retry: false,
    staleTime: 60_000,
  })
}

import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { reconocimientosKeys } from "@/features/gestion-estudiantil/reconocimientos/api/query-keys"
import { BASE_RECONOCIMIENTOS } from "@/features/gestion-estudiantil/reconocimientos/api/query/use-reconocimientos-query"
import type { SugerenciaPuesto } from "@/features/gestion-estudiantil/reconocimientos/api/types"

export interface SugerenciasParams {
  establecimiento: number | null
  sede: number | null
  jornada: number | null
}

/**
 * `GET /reconocimientos/sugerencias`: Puesto 1 del último período cerrado. Solo RECTOR y COORDINADOR:
 * para el resto el backend responde 403, así que `enabled` debe ser false y no se reintenta.
 */
export function useSugerenciasQuery(params: SugerenciasParams, enabled: boolean) {
  return useQuery({
    queryKey: reconocimientosKeys.sugerencias(params),
    queryFn: () =>
      evalCol.getRows<SugerenciaPuesto>(
        `${BASE_RECONOCIMIENTOS}/sugerencias${queryString({
          ESTABLECIMIENTO: params.establecimiento,
          SEDE: params.sede,
          JORNADA: params.jornada,
        })}`,
      ),
    enabled: enabled && params.establecimiento != null,
    retry: false,
  })
}

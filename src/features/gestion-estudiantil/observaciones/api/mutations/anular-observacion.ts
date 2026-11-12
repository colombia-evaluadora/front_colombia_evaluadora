import { evalCol } from "@/lib/eval-col-client"

import { BASE_OBSERVACIONES } from "@/features/gestion-estudiantil/observaciones/api/query/use-observaciones-query"
import {
  useObservacionesMutation,
  type MutationCfg,
  type ResultadoEscritura,
} from "@/features/gestion-estudiantil/observaciones/api/mutations/use-observaciones-mutation"
import type { AnularObservacionInput } from "@/features/gestion-estudiantil/observaciones/api/types"

/** `PUT /observaciones-sugerencias/:ID/anular` (Regla 3): se anula con motivo, no se elimina. Solo RECTOR y COORDINADOR. */
const anularObservacion = ({ id, MOTIVO }: AnularObservacionInput) =>
  evalCol.putRow<ResultadoEscritura>(`${BASE_OBSERVACIONES}/${id}/anular`, { MOTIVO: MOTIVO.trim() })

export const useAnularObservacion = ({ mutationConfig }: MutationCfg<typeof anularObservacion> = {}) =>
  useObservacionesMutation(anularObservacion, mutationConfig)

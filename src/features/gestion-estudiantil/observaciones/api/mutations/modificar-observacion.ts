import { evalCol } from "@/lib/eval-col-client"

import { BASE_OBSERVACIONES } from "@/features/gestion-estudiantil/observaciones/api/query/use-observaciones-query"
import {
  useObservacionesMutation,
  type MutationCfg,
  type ResultadoEscritura,
} from "@/features/gestion-estudiantil/observaciones/api/mutations/use-observaciones-mutation"
import type { ModificarObservacionInput } from "@/features/gestion-estudiantil/observaciones/api/types"

/** `PUT /observaciones-sugerencias/:ID`: solo Fecha, Título y Observación; el grupo y el destinatario no cambian. */
const modificarObservacion = ({ id, ...body }: ModificarObservacionInput) =>
  evalCol.putRow<ResultadoEscritura>(`${BASE_OBSERVACIONES}/${id}`, body)

export const useModificarObservacion = ({ mutationConfig }: MutationCfg<typeof modificarObservacion> = {}) =>
  useObservacionesMutation(modificarObservacion, mutationConfig)

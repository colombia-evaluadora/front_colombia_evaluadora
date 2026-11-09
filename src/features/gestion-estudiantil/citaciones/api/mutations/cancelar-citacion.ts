import { evalCol } from "@/lib/eval-col-client"

import { BASE_CITACIONES } from "@/features/gestion-estudiantil/citaciones/api/query/use-citaciones-query"
import {
  useCitacionesMutation,
  type MutationCfg,
  type ResultadoEscritura,
} from "@/features/gestion-estudiantil/citaciones/api/mutations/use-citaciones-mutation"
import type { CancelarCitacionInput } from "@/features/gestion-estudiantil/citaciones/api/types"

/** `POST /citaciones/:ID/cancelar`: Por programar, Programada o Confirmada → Cancelada (final). */
const cancelarCitacion = ({ id, MOTIVO }: CancelarCitacionInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_CITACIONES}/${id}/cancelar`, { MOTIVO: MOTIVO.trim() })

export const useCancelarCitacion = ({ mutationConfig }: MutationCfg<typeof cancelarCitacion> = {}) =>
  useCitacionesMutation(cancelarCitacion, mutationConfig)

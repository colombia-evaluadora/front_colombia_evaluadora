import { evalCol } from "@/lib/eval-col-client"

import { BASE_CITACIONES } from "@/features/gestion-estudiantil/citaciones/api/query/use-citaciones-query"
import {
  useCitacionesMutation,
  type MutationCfg,
  type ResultadoEscritura,
} from "@/features/gestion-estudiantil/citaciones/api/mutations/use-citaciones-mutation"
import type { ReprogramarCitacionInput } from "@/features/gestion-estudiantil/citaciones/api/types"

/** `POST /citaciones/:ID/reprogramar`: Programada o Confirmada (o No asistió en casos de origen del sistema) → Programada. */
const reprogramarCitacion = ({ id, ...body }: ReprogramarCitacionInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_CITACIONES}/${id}/reprogramar`, body)

export const useReprogramarCitacion = ({ mutationConfig }: MutationCfg<typeof reprogramarCitacion> = {}) =>
  useCitacionesMutation(reprogramarCitacion, mutationConfig)

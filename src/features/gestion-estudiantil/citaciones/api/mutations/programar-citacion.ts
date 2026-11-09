import { evalCol } from "@/lib/eval-col-client"

import { BASE_CITACIONES } from "@/features/gestion-estudiantil/citaciones/api/query/use-citaciones-query"
import {
  useCitacionesMutation,
  type MutationCfg,
  type ResultadoEscritura,
} from "@/features/gestion-estudiantil/citaciones/api/mutations/use-citaciones-mutation"
import type { ProgramarCitacionInput } from "@/features/gestion-estudiantil/citaciones/api/types"

/** `POST /citaciones/:ID/programar`: Por programar → Programada. `TEXTO` solo si la citación no tiene texto fijo. */
const programarCitacion = ({ id, ...body }: ProgramarCitacionInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_CITACIONES}/${id}/programar`, body)

export const useProgramarCitacion = ({ mutationConfig }: MutationCfg<typeof programarCitacion> = {}) =>
  useCitacionesMutation(programarCitacion, mutationConfig)

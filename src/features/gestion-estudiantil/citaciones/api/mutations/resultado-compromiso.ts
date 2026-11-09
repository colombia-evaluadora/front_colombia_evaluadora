import { evalCol } from "@/lib/eval-col-client"

import { BASE_COMPROMISOS } from "@/features/gestion-estudiantil/citaciones/api/query/use-compromisos-query"
import {
  useCitacionesMutation,
  type MutationCfg,
  type ResultadoEscritura,
} from "@/features/gestion-estudiantil/citaciones/api/mutations/use-citaciones-mutation"
import type { ResultadoCompromisoInput } from "@/features/gestion-estudiantil/citaciones/api/types"

/** `POST /compromisos/:ID/resultado`: Vigente → Cumplido o Incumplido (final); solo quien lo creó. */
const registrarResultado = ({ id, RESULTADO, OBSERVACION }: ResultadoCompromisoInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_COMPROMISOS}/${id}/resultado`, {
    RESULTADO,
    OBSERVACION: OBSERVACION?.trim() || null,
  })

export const useRegistrarResultado = ({ mutationConfig }: MutationCfg<typeof registrarResultado> = {}) =>
  useCitacionesMutation(registrarResultado, mutationConfig)

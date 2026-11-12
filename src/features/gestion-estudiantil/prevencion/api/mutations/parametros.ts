import { evalCol } from "@/lib/eval-col-client"

import { BASE_PREVENCION } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import {
  usePrevencionMutation,
  type MutationCfg,
} from "@/features/gestion-estudiantil/prevencion/api/mutations/use-prevencion-mutation"
import type { GuardarParametrosInput, ResultadoEscritura } from "@/features/gestion-estudiantil/prevencion/api/types"

/** `PUT /parametros` (Rector): rigen las alertas de todo el establecimiento. */
const guardarParametros = (input: GuardarParametrosInput) =>
  evalCol.putRow<ResultadoEscritura>(`${BASE_PREVENCION}/parametros`, input)

export const useGuardarParametros = ({ mutationConfig }: MutationCfg<typeof guardarParametros> = {}) =>
  usePrevencionMutation(guardarParametros, mutationConfig)

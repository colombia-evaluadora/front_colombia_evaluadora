import { evalCol } from "@/lib/eval-col-client"

import { BASE_RECONOCIMIENTOS } from "@/features/gestion-estudiantil/reconocimientos/api/query/use-reconocimientos-query"
import {
  useReconocimientosMutation,
  type MutationCfg,
  type ResultadoEscritura,
} from "@/features/gestion-estudiantil/reconocimientos/api/mutations/use-reconocimientos-mutation"
import type { AnularReconocimientoInput } from "@/features/gestion-estudiantil/reconocimientos/api/types"

/** `PUT /reconocimientos/:ID/anular` (Regla 3): se anula con motivo, no se elimina. Solo RECTOR y COORDINADOR. */
const anularReconocimiento = ({ id, MOTIVO }: AnularReconocimientoInput) =>
  evalCol.putRow<ResultadoEscritura>(`${BASE_RECONOCIMIENTOS}/${id}/anular`, { MOTIVO: MOTIVO.trim() })

export const useAnularReconocimiento = ({ mutationConfig }: MutationCfg<typeof anularReconocimiento> = {}) =>
  useReconocimientosMutation(anularReconocimiento, mutationConfig)

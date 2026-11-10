import { evalCol } from "@/lib/eval-col-client"

import { BASE_RECONOCIMIENTOS } from "@/features/gestion-estudiantil/reconocimientos/api/query/use-reconocimientos-query"
import {
  useReconocimientosMutation,
  type MutationCfg,
  type ResultadoEscritura,
} from "@/features/gestion-estudiantil/reconocimientos/api/mutations/use-reconocimientos-mutation"
import type { ModificarReconocimientoInput } from "@/features/gestion-estudiantil/reconocimientos/api/types"

/** `PUT /reconocimientos/:ID`: el estudiante no cambia. */
const modificarReconocimiento = ({ id, ...body }: ModificarReconocimientoInput) =>
  evalCol.putRow<ResultadoEscritura>(`${BASE_RECONOCIMIENTOS}/${id}`, { ...body, MOTIVO: body.MOTIVO.trim() })

export const useModificarReconocimiento = ({ mutationConfig }: MutationCfg<typeof modificarReconocimiento> = {}) =>
  useReconocimientosMutation(modificarReconocimiento, mutationConfig)

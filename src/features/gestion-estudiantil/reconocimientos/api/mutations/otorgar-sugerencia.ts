import { evalCol } from "@/lib/eval-col-client"

import { BASE_RECONOCIMIENTOS } from "@/features/gestion-estudiantil/reconocimientos/api/query/use-reconocimientos-query"
import {
  useReconocimientosMutation,
  type MutationCfg,
  type ResultadoEscritura,
} from "@/features/gestion-estudiantil/reconocimientos/api/mutations/use-reconocimientos-mutation"
import type { OtorgarSugerenciaInput } from "@/features/gestion-estudiantil/reconocimientos/api/types"

/** `POST /reconocimientos/sugerencias/otorgar` (Regla 32): el tipo lo fuerza el backend (Mejor desempeño académico). */
const otorgarSugerencia = (input: OtorgarSugerenciaInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_RECONOCIMIENTOS}/sugerencias/otorgar`, {
    ...input,
    MOTIVO: input.MOTIVO.trim(),
  })

export const useOtorgarSugerencia = ({ mutationConfig }: MutationCfg<typeof otorgarSugerencia> = {}) =>
  useReconocimientosMutation(otorgarSugerencia, mutationConfig)

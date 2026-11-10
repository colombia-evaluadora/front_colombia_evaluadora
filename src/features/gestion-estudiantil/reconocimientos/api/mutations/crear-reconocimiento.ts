import { evalCol } from "@/lib/eval-col-client"

import { BASE_RECONOCIMIENTOS } from "@/features/gestion-estudiantil/reconocimientos/api/query/use-reconocimientos-query"
import {
  useReconocimientosMutation,
  type MutationCfg,
  type ResultadoEscritura,
} from "@/features/gestion-estudiantil/reconocimientos/api/mutations/use-reconocimientos-mutation"
import type { CrearReconocimientoInput } from "@/features/gestion-estudiantil/reconocimientos/api/types"

/** `POST /reconocimientos`: un reconocimiento por matrícula (devuelve una fila con el id de cada uno); `FECHA` aaaa-mm-dd. */
const crearReconocimiento = (input: CrearReconocimientoInput) =>
  evalCol.postRows<ResultadoEscritura>(BASE_RECONOCIMIENTOS, { ...input, MOTIVO: input.MOTIVO.trim() })

export const useCrearReconocimiento = ({ mutationConfig }: MutationCfg<typeof crearReconocimiento> = {}) =>
  useReconocimientosMutation(crearReconocimiento, mutationConfig)

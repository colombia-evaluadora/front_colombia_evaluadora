import { evalCol } from "@/lib/eval-col-client"

import { BASE_CITACIONES } from "@/features/gestion-estudiantil/citaciones/api/query/use-citaciones-query"
import {
  useCitacionesMutation,
  type MutationCfg,
  type ResultadoEscritura,
} from "@/features/gestion-estudiantil/citaciones/api/mutations/use-citaciones-mutation"
import type { CrearCitacionInput } from "@/features/gestion-estudiantil/citaciones/api/types"

/** `POST /citaciones` (CITACIONES_COMPROMISOS / CREAR): nace Programada y avisa al acudiente. */
const crearCitacion = (input: CrearCitacionInput) => evalCol.postRow<ResultadoEscritura>(BASE_CITACIONES, input)

export const useCrearCitacion = ({ mutationConfig }: MutationCfg<typeof crearCitacion> = {}) =>
  useCitacionesMutation(crearCitacion, mutationConfig)

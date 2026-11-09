import { evalCol } from "@/lib/eval-col-client"

import { BASE_COMPROMISOS } from "@/features/gestion-estudiantil/citaciones/api/query/use-compromisos-query"
import {
  useCitacionesMutation,
  type MutationCfg,
  type ResultadoEscritura,
} from "@/features/gestion-estudiantil/citaciones/api/mutations/use-citaciones-mutation"
import type { CrearCompromisoInput } from "@/features/gestion-estudiantil/citaciones/api/types"

/**
 * `POST /compromisos` (CREAR): Vigente si `ACEPTADO` con `FK_ARCHIVO` (soporte ya cargado), si no
 * Pendiente de aceptación. `ITEMS` viaja como arreglo; el backend lo recibe como JSONB.
 */
const crearCompromiso = (input: CrearCompromisoInput) => evalCol.postRow<ResultadoEscritura>(BASE_COMPROMISOS, input)

export const useCrearCompromiso = ({ mutationConfig }: MutationCfg<typeof crearCompromiso> = {}) =>
  useCitacionesMutation(crearCompromiso, mutationConfig)

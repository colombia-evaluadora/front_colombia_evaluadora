import { evalCol } from "@/lib/eval-col-client"

import { BASE_COMPROMISOS } from "@/features/gestion-estudiantil/citaciones/api/query/use-compromisos-query"
import {
  useCitacionesMutation,
  type MutationCfg,
  type ResultadoEscritura,
} from "@/features/gestion-estudiantil/citaciones/api/mutations/use-citaciones-mutation"
import type { AceptacionPresencialInput } from "@/features/gestion-estudiantil/citaciones/api/types"

/** `POST /compromisos/:ID/aceptacion-presencial`: Pendiente de aceptación → Vigente, con el soporte firmado ya cargado. */
const registrarAceptacionPresencial = ({ id, FK_ARCHIVO }: AceptacionPresencialInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_COMPROMISOS}/${id}/aceptacion-presencial`, { FK_ARCHIVO })

export const useRegistrarAceptacionPresencial = ({
  mutationConfig,
}: MutationCfg<typeof registrarAceptacionPresencial> = {}) =>
  useCitacionesMutation(registrarAceptacionPresencial, mutationConfig)

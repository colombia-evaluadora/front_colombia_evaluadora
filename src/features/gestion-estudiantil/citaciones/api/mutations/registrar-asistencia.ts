import { evalCol } from "@/lib/eval-col-client"

import { BASE_CITACIONES } from "@/features/gestion-estudiantil/citaciones/api/query/use-citaciones-query"
import {
  useCitacionesMutation,
  type MutationCfg,
  type ResultadoEscritura,
} from "@/features/gestion-estudiantil/citaciones/api/mutations/use-citaciones-mutation"
import type { RegistrarAsistenciaInput } from "@/features/gestion-estudiantil/citaciones/api/types"

/** `POST /citaciones/:ID/asistencia`: Programada o Confirmada → Asistió o No asistió, después de la fecha y hora. */
const registrarAsistencia = ({ id, ASISTENCIA, RESUMEN }: RegistrarAsistenciaInput) =>
  evalCol.postRow<ResultadoEscritura>(`${BASE_CITACIONES}/${id}/asistencia`, { ASISTENCIA, RESUMEN: RESUMEN.trim() })

export const useRegistrarAsistencia = ({ mutationConfig }: MutationCfg<typeof registrarAsistencia> = {}) =>
  useCitacionesMutation(registrarAsistencia, mutationConfig)

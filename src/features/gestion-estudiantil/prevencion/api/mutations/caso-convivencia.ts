import { evalCol } from "@/lib/eval-col-client"

import { subirSoporteConvivencia } from "@/features/gestion-estudiantil/convivencia/api/mutations/casos"
import type { CasoDatosInput } from "@/features/gestion-estudiantil/convivencia/api/types"
import { BASE_PREVENCION } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import {
  usePrevencionMutation,
  type MutationCfg,
} from "@/features/gestion-estudiantil/prevencion/api/mutations/use-prevencion-mutation"
import type { ResultadoEscritura } from "@/features/gestion-estudiantil/prevencion/api/types"

export interface AbrirCasoInput {
  planId: number
  /** Los mismos datos que `POST /convivencia/casos` (sin estudiantes). */
  datos: CasoDatosInput
  tipoId: number
  /** pk de `ROL_SITUACION` del estudiante del plan. */
  rolId: number
  soporte: File | null
}

/** `POST /planes/:ID/caso-convivencia` (Regla 24): el soporte, si hay, se sube primero y viaja como `FK_ARCHIVO_SOPORTE`. */
async function abrirCaso({ planId, datos, tipoId, rolId, soporte }: AbrirCasoInput) {
  const archivo = soporte ? await subirSoporteConvivencia(soporte) : datos.FK_ARCHIVO_SOPORTE
  return evalCol.postRow<ResultadoEscritura>(`${BASE_PREVENCION}/planes/${planId}/caso-convivencia`, {
    ...datos,
    FK_ARCHIVO_SOPORTE: archivo,
    FK_TLV_TIPO: tipoId,
    FK_TLV_ROL: rolId,
    INVOLUCRADOS: [],
  })
}

export const useAbrirCasoConvivencia = ({ mutationConfig }: MutationCfg<typeof abrirCaso> = {}) =>
  usePrevencionMutation(abrirCaso, mutationConfig)

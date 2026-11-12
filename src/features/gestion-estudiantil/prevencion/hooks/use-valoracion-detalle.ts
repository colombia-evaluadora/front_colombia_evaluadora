import { useCallback } from "react"

import type { ValoracionDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { useDialogosPrevencion } from "@/features/gestion-estudiantil/prevencion/components/dialogos/use-dialogos-prevencion"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"

/** Navegación y diálogo de anulación del detalle de una valoración. */
export function useValoracionDetalle(v: ValoracionDetalle) {
  const { volver, irPlan } = useNavegacionPrevencion()
  const dialogos = useDialogosPrevencion()
  const { abrir } = dialogos
  const anular = useCallback(
    () => abrir({ dialogo: "anular-valoracion", valoracionId: v.id, estudiante: v.estudiante_nombre }),
    [abrir, v.id, v.estudiante_nombre],
  )
  const verPlan = useCallback(() => {
    if (v.fk_tprevencion_plan != null) irPlan(v.fk_tprevencion_plan)
  }, [irPlan, v.fk_tprevencion_plan])
  return { volver, verPlan, anular, dialogos: dialogos.dialogos }
}

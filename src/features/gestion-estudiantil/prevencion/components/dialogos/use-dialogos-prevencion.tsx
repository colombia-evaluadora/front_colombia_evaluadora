import { useCallback, useState } from "react"

import type { MarcarPlanInput } from "@/features/gestion-estudiantil/prevencion/api/types"
import { DialogAceptacionPresencial } from "@/features/gestion-estudiantil/prevencion/components/dialogos/dialog-aceptacion-presencial"
import { DialogAnularPrevencion } from "@/features/gestion-estudiantil/prevencion/components/dialogos/dialog-anular-prevencion"
import { DialogMarcarPlan } from "@/features/gestion-estudiantil/prevencion/components/dialogos/dialog-marcar-plan"
import { DialogRegistrarAvance } from "@/features/gestion-estudiantil/prevencion/components/dialogos/dialog-registrar-avance"

export type DialogoPrevencion =
  | { dialogo: "avance"; planId: number; estudiante: string; accionId?: number }
  | { dialogo: "aceptacion"; planId: number; estudiante: string }
  | { dialogo: "marcar"; planId: number; estudiante: string; estado?: MarcarPlanInput["ESTADO"] }
  | { dialogo: "anular-plan"; planId: number; estudiante: string }
  | { dialogo: "anular-valoracion"; valoracionId: number; estudiante: string }

/** Un solo modal de operación abierto a la vez; lo comparten el listado y el detalle. Cada uno se monta al abrir. */
export function useDialogosPrevencion() {
  const [abierto, setAbierto] = useState<DialogoPrevencion | null>(null)
  const cerrar = useCallback(() => setAbierto(null), [])
  const d = abierto
  return {
    abrir: setAbierto,
    dialogos: d && (
      <>
        {d.dialogo === "avance" && (
          <DialogRegistrarAvance planId={d.planId} estudianteNombre={d.estudiante} accionId={d.accionId} onClose={cerrar} />
        )}
        {d.dialogo === "aceptacion" && (
          <DialogAceptacionPresencial planId={d.planId} estudianteNombre={d.estudiante} onClose={cerrar} />
        )}
        {d.dialogo === "marcar" && (
          <DialogMarcarPlan planId={d.planId} estudianteNombre={d.estudiante} estadoInicial={d.estado} onClose={cerrar} />
        )}
        {d.dialogo === "anular-plan" && (
          <DialogAnularPrevencion objeto="plan" id={d.planId} estudianteNombre={d.estudiante} onClose={cerrar} />
        )}
        {d.dialogo === "anular-valoracion" && (
          <DialogAnularPrevencion objeto="valoracion" id={d.valoracionId} estudianteNombre={d.estudiante} onClose={cerrar} />
        )}
      </>
    ),
  }
}

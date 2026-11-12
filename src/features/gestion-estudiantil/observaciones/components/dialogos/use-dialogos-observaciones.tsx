import { useCallback, useState } from "react"

import type { ObservacionRow } from "@/features/gestion-estudiantil/observaciones/api/types"
import { DialogAnularObservacion } from "@/features/gestion-estudiantil/observaciones/components/dialogos/dialog-anular-observacion"
import { DialogDetalleObservacion } from "@/features/gestion-estudiantil/observaciones/components/dialogos/dialog-detalle-observacion"
import {
  DialogModificarObservacion,
  DialogNuevaObservacion,
} from "@/features/gestion-estudiantil/observaciones/components/dialogos/dialog-observacion-form"

export type DialogoObservacion = "ver" | "modificar" | "anular"

type Abierto = { dialogo: "nuevo" } | { dialogo: DialogoObservacion; observacion: ObservacionRow }

/** Un solo diálogo abierto a la vez; cada uno se monta al abrir, con el estado limpio. */
export function useDialogosObservaciones() {
  const [abierto, setAbierto] = useState<Abierto | null>(null)
  const cerrar = useCallback(() => setAbierto(null), [])
  const abrirNueva = useCallback(() => setAbierto({ dialogo: "nuevo" }), [])
  const abrir = useCallback(
    (dialogo: DialogoObservacion, observacion: ObservacionRow) => setAbierto({ dialogo, observacion }),
    [],
  )

  const dialogos = abierto && (
    <>
      {abierto.dialogo === "nuevo" && <DialogNuevaObservacion onClose={cerrar} />}
      {abierto.dialogo === "ver" && (
        <DialogDetalleObservacion observacionId={abierto.observacion.pk} onClose={cerrar} onAccion={abrir} />
      )}
      {abierto.dialogo === "modificar" && <DialogModificarObservacion observacion={abierto.observacion} onClose={cerrar} />}
      {abierto.dialogo === "anular" && <DialogAnularObservacion observacion={abierto.observacion} onClose={cerrar} />}
    </>
  )
  return { abrir, abrirNueva, cerrar, dialogos }
}

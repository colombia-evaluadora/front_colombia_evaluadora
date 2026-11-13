import { useCallback, useState } from "react"

import type { ResumenSenalSM } from "@/features/gestion-estudiantil/prevencion/api/types"
import { DialogCerrarSenal } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/dialogos/dialog-cerrar-senal"
import { DialogRegistrarAtencion } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/dialogos/dialog-registrar-atencion"

export type DialogoSaludMental = { dialogo: "atencion" | "cerrar"; senal: ResumenSenalSM }

/** Un solo modal de operación abierto a la vez; lo comparten el listado y el detalle de la señal. */
export function useDialogosSaludMental() {
  const [abierto, setAbierto] = useState<DialogoSaludMental | null>(null)
  const cerrar = useCallback(() => setAbierto(null), [])
  const d = abierto
  return {
    abrir: setAbierto,
    dialogos: d && (
      <>
        {d.dialogo === "atencion" && <DialogRegistrarAtencion senal={d.senal} onClose={cerrar} />}
        {d.dialogo === "cerrar" && <DialogCerrarSenal senal={d.senal} onClose={cerrar} />}
      </>
    ),
  }
}

import { useState } from "react"

import type { CasoResumen } from "@/features/gestion-estudiantil/convivencia/api/types"
import { DialogCambiarTipo } from "@/features/gestion-estudiantil/convivencia/components/dialogs/dialog-cambiar-tipo"
import { DialogAnularCaso, DialogCerrarCaso } from "@/features/gestion-estudiantil/convivencia/components/dialogs/dialog-cerrar-anular"
import { DialogGestor } from "@/features/gestion-estudiantil/convivencia/components/dialogs/dialog-gestor"
import { DialogRegistrarAccion } from "@/features/gestion-estudiantil/convivencia/components/dialogs/dialog-registrar-accion"

export type DialogoCaso = "accion" | "gestor" | "tipo" | "cerrar" | "anular"

/** Un solo diálogo abierto a la vez, compartido por el listado y el detalle. */
export function useDialogosCaso() {
  const [abierto, setAbierto] = useState<{ dialogo: DialogoCaso; caso: CasoResumen } | null>(null)
  const casoSi = (d: DialogoCaso) => (abierto?.dialogo === d ? abierto.caso : null)
  const cerrar = () => setAbierto(null)

  return {
    abrir: (dialogo: DialogoCaso, caso: CasoResumen) => setAbierto({ dialogo, caso }),
    dialogos: (
      <>
        {abierto?.dialogo === "accion" && <DialogRegistrarAccion caso={casoSi("accion")} onClose={cerrar} />}
        <DialogGestor key={casoSi("gestor")?.id ?? "none"} caso={casoSi("gestor")} onClose={cerrar} />
        {abierto?.dialogo === "tipo" && <DialogCambiarTipo caso={casoSi("tipo")} onClose={cerrar} />}
        <DialogCerrarCaso caso={casoSi("cerrar")} onClose={cerrar} />
        <DialogAnularCaso caso={casoSi("anular")} onClose={cerrar} />
      </>
    ),
  }
}

import { useCallback, useState } from "react"

import type { ReconocimientoRow, SugerenciaPuesto } from "@/features/gestion-estudiantil/reconocimientos/api/types"
import { DialogAnularReconocimiento } from "@/features/gestion-estudiantil/reconocimientos/components/dialogos/dialog-anular-reconocimiento"
import { DialogMencionHonor } from "@/features/gestion-estudiantil/reconocimientos/components/dialogos/dialog-mencion-honor"
import {
  DialogModificarReconocimiento,
  DialogNuevoReconocimiento,
  DialogOtorgarSugerencia,
} from "@/features/gestion-estudiantil/reconocimientos/components/dialogos/dialog-reconocimiento-form"

export type DialogoReconocimiento = "nuevo" | "modificar" | "otorgar" | "anular" | "mencion"

type Abierto =
  | { dialogo: "nuevo" }
  | { dialogo: "modificar" | "anular" | "mencion"; reconocimiento: ReconocimientoRow }
  | { dialogo: "otorgar"; sugerencia: SugerenciaPuesto }

/**
 * Un solo diálogo abierto a la vez; cada uno se monta al abrir, con el estado limpio.
 */
export function useDialogosReconocimientos(establecimiento: number | null) {
  const [abierto, setAbierto] = useState<Abierto | null>(null)
  const cerrar = useCallback(() => setAbierto(null), [])
  const abrirNuevo = useCallback(() => setAbierto({ dialogo: "nuevo" }), [])
  const abrir = useCallback(
    (dialogo: "modificar" | "anular" | "mencion", reconocimiento: ReconocimientoRow) =>
      setAbierto({ dialogo, reconocimiento }),
    [],
  )
  const abrirOtorgar = useCallback((sugerencia: SugerenciaPuesto) => setAbierto({ dialogo: "otorgar", sugerencia }), [])

  const dialogos = abierto && (
    <>
      {abierto.dialogo === "nuevo" && <DialogNuevoReconocimiento establecimiento={establecimiento} onClose={cerrar} />}
      {abierto.dialogo === "modificar" && (
        <DialogModificarReconocimiento
          reconocimiento={abierto.reconocimiento}
          establecimiento={establecimiento}
          onClose={cerrar}
        />
      )}
      {abierto.dialogo === "anular" && <DialogAnularReconocimiento reconocimiento={abierto.reconocimiento} onClose={cerrar} />}
      {abierto.dialogo === "mencion" && <DialogMencionHonor reconocimientoId={abierto.reconocimiento.id} onClose={cerrar} />}
      {abierto.dialogo === "otorgar" && (
        <DialogOtorgarSugerencia sugerencia={abierto.sugerencia} establecimiento={establecimiento} onClose={cerrar} />
      )}
    </>
  )
  return { abierto, abrir, abrirNuevo, abrirOtorgar, cerrar, dialogos }
}

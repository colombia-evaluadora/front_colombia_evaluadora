import { useState } from "react"

import type { CitacionRow, CompromisoRow } from "@/features/gestion-estudiantil/citaciones/api/types"
import { DialogAceptacionPresencial } from "@/features/gestion-estudiantil/citaciones/components/dialogos/dialog-aceptacion-presencial"
import { DialogAsistenciaCitacion } from "@/features/gestion-estudiantil/citaciones/components/dialogos/dialog-asistencia-citacion"
import { DialogCancelarCitacion } from "@/features/gestion-estudiantil/citaciones/components/dialogos/dialog-cancelar-citacion"
import { DialogDocumentoCitacion } from "@/features/gestion-estudiantil/citaciones/components/dialogos/dialog-documento-citacion"
import { DialogDocumentoCompromiso } from "@/features/gestion-estudiantil/citaciones/components/dialogos/dialog-documento-compromiso"
import { DialogProgramarCitacion } from "@/features/gestion-estudiantil/citaciones/components/dialogos/dialog-programar-citacion"
import { DialogReprogramarCitacion } from "@/features/gestion-estudiantil/citaciones/components/dialogos/dialog-reprogramar-citacion"
import { DialogResultadoCompromiso } from "@/features/gestion-estudiantil/citaciones/components/dialogos/dialog-resultado-compromiso"

export type DialogoCitacion = "programar" | "reprogramar" | "cancelar" | "asistencia" | "documento"
export type DialogoCompromiso = "aceptacion" | "resultado" | "documento"

/** Un solo modal de citación abierto a la vez; cada uno se monta al abrir, con el estado limpio. */
export function useDialogosCitacion() {
  const [abierto, setAbierto] = useState<{ dialogo: DialogoCitacion; citacion: CitacionRow } | null>(null)
  const cerrar = () => setAbierto(null)
  const c = abierto?.citacion
  return {
    abrir: (dialogo: DialogoCitacion, citacion: CitacionRow) => setAbierto({ dialogo, citacion }),
    dialogos: c && (
      <>
        {abierto.dialogo === "programar" && <DialogProgramarCitacion citacion={c} onClose={cerrar} />}
        {abierto.dialogo === "reprogramar" && <DialogReprogramarCitacion citacion={c} onClose={cerrar} />}
        {abierto.dialogo === "cancelar" && <DialogCancelarCitacion citacion={c} onClose={cerrar} />}
        {abierto.dialogo === "asistencia" && <DialogAsistenciaCitacion citacion={c} onClose={cerrar} />}
        {abierto.dialogo === "documento" && <DialogDocumentoCitacion citacionId={c.id} onClose={cerrar} />}
      </>
    ),
  }
}

/** Ídem para compromisos; lo comparten el listado y el detalle. */
export function useDialogosCompromiso() {
  const [abierto, setAbierto] = useState<{ dialogo: DialogoCompromiso; compromiso: CompromisoRow } | null>(null)
  const cerrar = () => setAbierto(null)
  const c = abierto?.compromiso
  return {
    abrir: (dialogo: DialogoCompromiso, compromiso: CompromisoRow) => setAbierto({ dialogo, compromiso }),
    dialogos: c && (
      <>
        {abierto.dialogo === "aceptacion" && <DialogAceptacionPresencial compromiso={c} onClose={cerrar} />}
        {abierto.dialogo === "resultado" && <DialogResultadoCompromiso compromiso={c} onClose={cerrar} />}
        {abierto.dialogo === "documento" && <DialogDocumentoCompromiso compromisoId={c.id} onClose={cerrar} />}
      </>
    ),
  }
}

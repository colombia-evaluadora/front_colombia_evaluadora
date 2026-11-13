import { useCallback, useState } from "react"

import type { BeneficiarioEstrategia, ResumenEstrategia } from "@/features/gestion-estudiantil/prevencion/api/types"
import { DialogAgregarBeneficiarios } from "@/features/gestion-estudiantil/prevencion/components/estrategias/dialogos/dialog-agregar-beneficiarios"
import { DialogCopiarEstrategia } from "@/features/gestion-estudiantil/prevencion/components/estrategias/dialogos/dialog-copiar-estrategia"
import { DialogFinalizarEstrategia } from "@/features/gestion-estudiantil/prevencion/components/estrategias/dialogos/dialog-finalizar-estrategia"
import { DialogRetirarBeneficiario } from "@/features/gestion-estudiantil/prevencion/components/estrategias/dialogos/dialog-retirar-beneficiario"

export type DialogoEstrategia =
  | { dialogo: "copiar" | "finalizar" | "beneficiarios"; estrategia: ResumenEstrategia }
  | {
      dialogo: "retirar"
      estrategia: Pick<ResumenEstrategia, "id" | "nombre">
      beneficiario: Pick<BeneficiarioEstrategia, "id" | "estudiante_nombre" | "fecha_ingreso">
    }

/** Un solo modal de operación abierto a la vez; lo comparten el listado, el detalle y el formulario de la estrategia. */
export function useDialogosEstrategias() {
  const [abierto, setAbierto] = useState<DialogoEstrategia | null>(null)
  const cerrar = useCallback(() => setAbierto(null), [])
  const d = abierto
  return {
    abrir: setAbierto,
    dialogos: d && (
      <>
        {d.dialogo === "copiar" && <DialogCopiarEstrategia estrategia={d.estrategia} onClose={cerrar} />}
        {d.dialogo === "finalizar" && <DialogFinalizarEstrategia estrategia={d.estrategia} onClose={cerrar} />}
        {d.dialogo === "beneficiarios" && <DialogAgregarBeneficiarios estrategia={d.estrategia} onClose={cerrar} />}
        {d.dialogo === "retirar" && (
          <DialogRetirarBeneficiario estrategia={d.estrategia} beneficiario={d.beneficiario} onClose={cerrar} />
        )}
      </>
    ),
  }
}

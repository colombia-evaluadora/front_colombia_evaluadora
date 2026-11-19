import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { ProhibitIcon } from "@/components/ui/icons"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError, errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useAnularAcomp } from "@/features/gestion-estudiantil/prevencion/api/mutations/acompanamientos"
import type { ResumenAcomp } from "@/features/gestion-estudiantil/prevencion/api/types"
import { ResumenAcompDialogo } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/dialogos/resumen-acomp"
import { MOTIVO_ANULACION_MAX } from "@/features/gestion-estudiantil/prevencion/utils/formularios-acompanamiento"

/**
 * Anular un acompañamiento no cerrado por error (Regla 3): Supervisor de sede o Administrador, con motivo. No se
 * reutiliza `DialogAnularPrevencion` porque está atado a las mutaciones de plan y valoración.
 */
export function DialogAnularAcomp({ acomp, onClose }: { acomp: ResumenAcomp; onClose: () => void }) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const [motivo, setMotivo] = useState("")
  const error = errorLargo(motivo, 1, MOTIVO_ANULACION_MAX, "El motivo de la anulación")
  const mut = useAnularAcomp({
    mutationConfig: {
      onSuccess: () => {
        notify("Acompañamiento anulado.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  return (
    <DialogoOperacionShell
      titulo={`Anular acompañamiento — ${acomp.estudiante_nombre}`}
      resumen={<ResumenAcompDialogo a={acomp} />}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{
        label: "Anular",
        color: "destructive",
        icon: <ProhibitIcon data-icon="inline-start" />,
        onClick: () => {
          s.setIntento(true)
          s.setError(null)
          if (error) return enfocarPrimerError()
          mut.mutate({ id: acomp.id, MOTIVO: motivo })
        },
      }}
    >
      <p className="text-sm">El acompañamiento se conserva como Anulado; no se elimina.</p>
      <TextoLargo
        id="acomp-motivo-anulacion"
        label="Motivo de la anulación"
        required
        max={MOTIVO_ANULACION_MAX}
        rows={4}
        value={motivo}
        error={s.intento ? error : undefined}
        onChange={setMotivo}
      />
    </DialogoOperacionShell>
  )
}

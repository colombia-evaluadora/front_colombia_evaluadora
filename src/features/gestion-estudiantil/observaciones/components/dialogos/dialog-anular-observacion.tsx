import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { ProhibitIcon } from "@/components/ui/icons"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { enfocarPrimerError, errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useAnularObservacion } from "@/features/gestion-estudiantil/observaciones/api/mutations/anular-observacion"
import type { ObservacionRow } from "@/features/gestion-estudiantil/observaciones/api/types"
import { MOTIVO_ANULACION_MAX } from "@/features/gestion-estudiantil/observaciones/utils/formularios"

interface Props {
  observacion: Pick<ObservacionRow, "pk" | "titulo" | "dirigida_a" | "fecha" | "fk_tmatricula" | "grado_grupo">
  onClose: () => void
}

/** «Se anulará la observación Lectura diaria de Tomás Díaz Arango (03/04/2027).» (G.7.ACC.2). */
function resumenAnulacion(o: Props["observacion"]) {
  const deQuien = o.fk_tmatricula != null ? o.dirigida_a : `todo el grupo ${o.grado_grupo}`
  return (
    <>
      Se anulará la observación {o.titulo && <strong>{o.titulo} </strong>}de {deQuien} ({formatFecha(o.fecha)}).
      Dejará de verse en el boletín y en el portal.
    </>
  )
}

/** Anular la observación (Regla 3): motivo obligatorio (1-500); no se elimina, queda como Anulada. */
export function DialogAnularObservacion({ observacion: o, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const [motivo, setMotivo] = useState("")
  const mut = useAnularObservacion({
    mutationConfig: {
      onSuccess: () => {
        notify("Observación anulada.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })
  const error = errorLargo(motivo, 1, MOTIVO_ANULACION_MAX, "El motivo de la anulación")

  return (
    <DialogoOperacionShell
      titulo="Anular la observación"
      resumen={resumenAnulacion(o)}
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
          if (error) {
            enfocarPrimerError()
            return
          }
          mut.mutate({ id: o.pk, MOTIVO: motivo.trim() })
        },
      }}
    >
      <TextoLargo
        id="anular-observacion-motivo"
        label="Motivo de la anulación"
        required
        max={MOTIVO_ANULACION_MAX}
        value={motivo}
        error={s.intento ? error : undefined}
        onChange={setMotivo}
      />
    </DialogoOperacionShell>
  )
}

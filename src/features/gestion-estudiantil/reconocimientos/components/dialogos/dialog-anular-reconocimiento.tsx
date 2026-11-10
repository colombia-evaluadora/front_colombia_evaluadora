import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon, ProhibitIcon } from "@/components/ui/icons"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError, errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { useAnularReconocimiento } from "@/features/gestion-estudiantil/reconocimientos/api/mutations/anular-reconocimiento"
import type { ReconocimientoRow } from "@/features/gestion-estudiantil/reconocimientos/api/types"

interface Props {
  reconocimiento: ReconocimientoRow
  onClose: () => void
}

/** Anular reconocimiento (Regla 3): motivo obligatorio (1-500); no se elimina, queda como Anulado. */
export function DialogAnularReconocimiento({ reconocimiento: r, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const [motivo, setMotivo] = useState("")
  const mut = useAnularReconocimiento({
    mutationConfig: {
      onSuccess: () => {
        notify("Reconocimiento anulado.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })
  const error = errorLargo(motivo, 1, 500, "El motivo")

  return (
    <DialogoOperacionShell
      titulo={`Anular reconocimiento — ${r.estudiante_nombre}`}
      resumen={`${r.tipo_nombre} · ${formatFecha(r.fecha)}`}
      cancelarLabel="Volver"
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
          mut.mutate({ id: r.id, MOTIVO: motivo.trim() })
        },
      }}
    >
      <TextoLargo
        id="anular-reconocimiento-motivo"
        label="Motivo"
        required
        max={500}
        placeholder="Por qué se anula el reconocimiento"
        value={motivo}
        error={s.intento ? error : undefined}
        onChange={setMotivo}
      />
      <Alert>
        <InfoIcon aria-hidden="true" />
        <AlertDescription>El reconocimiento no se elimina: queda registrado como anulado, con su motivo.</AlertDescription>
      </Alert>
    </DialogoOperacionShell>
  )
}

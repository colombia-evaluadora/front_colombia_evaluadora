import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon, ProhibitIcon } from "@/components/ui/icons"

import { useCancelarCitacion } from "@/features/gestion-estudiantil/citaciones/api/mutations/cancelar-citacion"
import type { CitacionRow } from "@/features/gestion-estudiantil/citaciones/api/types"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { ResumenCitacion } from "@/features/gestion-estudiantil/citaciones/components/dialogos/resumen-citacion"
import { enfocarPrimerError, errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"

interface Props {
  citacion: CitacionRow
  onClose: () => void
}

/** Cancelar citación (G.3.CIT.5, §4.1): motivo obligatorio (1-1000); solo Por programar, Programada o Confirmada. */
export function DialogCancelarCitacion({ citacion: c, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const [motivo, setMotivo] = useState("")
  const mut = useCancelarCitacion({
    mutationConfig: {
      onSuccess: () => {
        notify("Citación cancelada.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })
  const error = errorLargo(motivo, 1, 1000, "El motivo")
  // El acudiente solo recibe aviso si la citación ya estaba programada (no si era Por programar).
  const avisa = c.estado_valor !== "POR_PROGRAMAR"

  return (
    <DialogoOperacionShell
      titulo={`Cancelar citación — ${c.estudiante_nombre}`}
      resumen={<ResumenCitacion c={c} />}
      cancelarLabel="Volver"
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{
        label: "Cancelar citación",
        color: "destructive",
        icon: <ProhibitIcon data-icon="inline-start" />,
        onClick: () => {
          s.setIntento(true)
          s.setError(null)
          if (error) {
            enfocarPrimerError()
            return
          }
          mut.mutate({ id: c.id, MOTIVO: motivo.trim() })
        },
      }}
    >
      <TextoLargo
        id="cancelar-motivo"
        label="Motivo"
        required
        max={1000}
        placeholder="Por qué se cancela la citación"
        value={motivo}
        error={s.intento ? error : undefined}
        onChange={setMotivo}
      />
      {avisa && (
        <Alert variant="info">
          <InfoIcon aria-hidden="true" />
          <AlertDescription>
            Se avisará a {c.acudiente_nombre ?? "el acudiente"} de la cancelación.
          </AlertDescription>
        </Alert>
      )}
    </DialogoOperacionShell>
  )
}

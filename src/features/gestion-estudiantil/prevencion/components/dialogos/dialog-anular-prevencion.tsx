import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { ProhibitIcon } from "@/components/ui/icons"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError, errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useAnularPlan } from "@/features/gestion-estudiantil/prevencion/api/mutations/planes"
import { useAnularValoracion } from "@/features/gestion-estudiantil/prevencion/api/mutations/valoraciones"
import { MOTIVO_MAX } from "@/features/gestion-estudiantil/prevencion/utils/formularios-seguimiento"

interface Props {
  /** Qué se anula: el plan o la valoración (Regla 3: se anula con motivo, no se elimina). */
  objeto: "plan" | "valoracion"
  id: number
  estudianteNombre: string
  onClose: () => void
}

const TEXTOS = {
  plan: {
    titulo: "Anular el plan",
    resumen: "El plan se conserva en el historial como Anulado y el estudiante queda sin plan abierto.",
    exito: "Plan anulado.",
  },
  valoracion: {
    titulo: "Anular la valoración",
    resumen: "La valoración se conserva en el historial como Anulada y deja de ser el nivel de riesgo actual.",
    exito: "Valoración anulada.",
  },
}

/** Anular el plan o la valoración con motivo obligatorio. */
export function DialogAnularPrevencion({ objeto, id, estudianteNombre, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const [motivo, setMotivo] = useState("")
  const t = TEXTOS[objeto]
  const opciones = {
    mutationConfig: {
      onSuccess: () => {
        notify(t.exito, { variant: "success" as const })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  }
  const anularPlan = useAnularPlan(opciones)
  const anularValoracion = useAnularValoracion(opciones)
  const mut = objeto === "plan" ? anularPlan : anularValoracion
  const error = errorLargo(motivo, 1, MOTIVO_MAX, "El motivo de la anulación")

  return (
    <DialogoOperacionShell
      titulo={`${t.titulo} — ${estudianteNombre}`}
      resumen={t.resumen}
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
          mut.mutate({ id, MOTIVO: motivo.trim() })
        },
      }}
    >
      <TextoLargo
        id={`anular-${objeto}-motivo`}
        label="Motivo de la anulación"
        required
        max={MOTIVO_MAX}
        value={motivo}
        error={s.intento ? error : undefined}
        onChange={setMotivo}
      />
    </DialogoOperacionShell>
  )
}

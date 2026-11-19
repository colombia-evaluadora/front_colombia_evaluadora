import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { CheckCircleIcon } from "@/components/ui/icons"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useMarcarPlan } from "@/features/gestion-estudiantil/prevencion/api/mutations/planes"
import type { MarcarPlanInput } from "@/features/gestion-estudiantil/prevencion/api/types"

const RESULTADOS = [
  { value: "SUPERADO", label: "Superado" },
  { value: "INCUMPLIDO", label: "Incumplido" },
]

interface Props {
  planId: number
  estudianteNombre: string
  /** Resultado preseleccionado (los botones del detalle ya lo eligen). */
  estadoInicial?: MarcarPlanInput["ESTADO"]
  onClose: () => void
}

/** Marcar el plan Superado o Incumplido, con confirmación (§9.3: «Marcar plan [estado]» → Confirmar). */
export function DialogMarcarPlan({ planId, estudianteNombre, estadoInicial, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const [estado, setEstado] = useState<string>(estadoInicial ?? "")
  const mut = useMarcarPlan({
    mutationConfig: {
      onSuccess: () => {
        notify("Plan marcado.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })
  const error = estado ? undefined : "El resultado del plan es obligatorio."
  const etiqueta = RESULTADOS.find((r) => r.value === estado)?.label

  return (
    <DialogoOperacionShell
      titulo={`Marcar plan${etiqueta ? ` ${etiqueta}` : ""} — ${estudianteNombre}`}
      resumen="El plan pasa a su estado final y deja de recibir avances."
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{
        label: "Confirmar",
        icon: <CheckCircleIcon data-icon="inline-start" />,
        onClick: () => {
          s.setIntento(true)
          s.setError(null)
          if (error) {
            enfocarPrimerError()
            return
          }
          mut.mutate({ id: planId, ESTADO: estado as MarcarPlanInput["ESTADO"] })
        },
      }}
    >
      <ComboOpciones
        id="marcar-estado"
        label="Resultado del plan"
        required
        size="default"
        todos={false}
        placeholder="Seleccione"
        value={estado}
        options={RESULTADOS}
        error={s.intento ? error : undefined}
        onChange={setEstado}
      />
    </DialogoOperacionShell>
  )
}

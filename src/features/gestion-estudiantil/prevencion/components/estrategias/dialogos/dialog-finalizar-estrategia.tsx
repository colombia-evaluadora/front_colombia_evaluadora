import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { CheckCircleIcon } from "@/components/ui/icons"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useFinalizarEstrategia } from "@/features/gestion-estudiantil/prevencion/api/mutations/estrategias"
import type { ResumenEstrategia } from "@/features/gestion-estudiantil/prevencion/api/types"
import { BadgeEstadoEstrategia } from "@/features/gestion-estudiantil/prevencion/components/estrategias/badge-estado-estrategia"
import {
  RESULTADO_MAX,
  RESULTADO_NO_EJECUTADA,
  formatRangoFechas,
  validarFinalizar,
} from "@/features/gestion-estudiantil/prevencion/utils/formularios-estrategias"

interface Props {
  estrategia: ResumenEstrategia
  onClose: () => void
}

/**
 * Finalizar la estrategia (G.8.EST.9-10): el Resultado lo escribe una persona. Si está Planeada, no se
 * ejecutará: se sugiere «No se ejecutó» como texto inicial editable.
 */
export function DialogFinalizarEstrategia({ estrategia, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const planeada = estrategia.estado === "PLANEADA"
  const [resultado, setResultado] = useState(planeada ? RESULTADO_NO_EJECUTADA : "")
  const errores = validarFinalizar(resultado)

  const mut = useFinalizarEstrategia({
    mutationConfig: {
      onSuccess: () => {
        notify("Estrategia finalizada.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  function finalizar() {
    s.setIntento(true)
    s.setError(null)
    if (errores.resultado) {
      enfocarPrimerError()
      return
    }
    mut.mutate({ id: estrategia.id, RESULTADO: resultado })
  }

  return (
    <DialogoOperacionShell
      titulo={`Finalizar ${estrategia.nombre}`}
      resumen={
        planeada ? (
          <span className="flex flex-wrap items-center gap-2">
            <BadgeEstadoEstrategia estado={estrategia.estado} nombre={estrategia.estado_nombre} />
            {formatRangoFechas(estrategia.fecha_inicio, estrategia.fecha_fin)} · Responsable: {estrategia.responsable_nombre}
          </span>
        ) : undefined
      }
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{ label: "Finalizar", icon: <CheckCircleIcon data-icon="inline-start" />, onClick: finalizar }}
    >
      <p className="text-sm">
        {planeada ? "La estrategia no se ejecutará y pasará a Finalizada." : "La estrategia pasará a Finalizada."}
      </p>
      <TextoLargo
        id="finalizar-resultado"
        label="Resultado"
        required
        rows={4}
        max={RESULTADO_MAX}
        value={resultado}
        error={s.intento ? errores.resultado : undefined}
        onChange={setResultado}
      />
    </DialogoOperacionShell>
  )
}

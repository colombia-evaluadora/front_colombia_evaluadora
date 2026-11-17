import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { Field, FieldLabel } from "@/components/ui/field"
import { FloppyDiskIcon } from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError, errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useValidarCaso } from "@/features/gestion-estudiantil/reintegracion/api/mutations/casos"
import type { CasoDetalle, DecisionValidacion } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { ResumenCasoDialogo } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/resumen-caso-dialogo"

const OBSERVACION_MIN = 10
const OBSERVACION_MAX = 500

/** Validar caso — [Estudiante]: Validar deja pasar a Intervención; Devolver exige una observación de 10 a 500. */
export function DialogoValidar({ caso: c, onClose }: { caso: CasoDetalle; onClose: () => void }) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const [decision, setDecision] = useState<DecisionValidacion>("VALIDAR")
  const [observacion, setObservacion] = useState("")

  const devuelve = decision === "DEVOLVER"
  const largo = observacion.trim().length
  const errorObservacion = !devuelve
    ? undefined
    : largo === 0
      ? "La observación al devolver el caso es obligatoria."
      : errorLargo(observacion, OBSERVACION_MIN, OBSERVACION_MAX, "La observación al devolver el caso")

  const mut = useValidarCaso({
    mutationConfig: {
      onSuccess: () => {
        notify(devuelve ? "Caso devuelto al Profesional de trabajo social." : "Caso validado.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  function guardar() {
    s.setIntento(true)
    s.setError(null)
    if (errorObservacion) {
      enfocarPrimerError()
      return
    }
    mut.mutate({ id: c.id, DECISION: decision, OBSERVACION: devuelve ? observacion : null })
  }

  return (
    <DialogoOperacionShell
      titulo={`Validar caso — ${c.estudiante_nombre}`}
      resumen={<ResumenCasoDialogo caso={c} />}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{ label: "Guardar validación", icon: <FloppyDiskIcon data-icon="inline-start" />, onClick: guardar }}
    >
      <Field orientation="vertical" variant="outlined" className="gap-2" role="group" aria-labelledby="validar-label">
        <FieldLabel id="validar-label">Decisión*</FieldLabel>
        <RadioGroup
          aria-labelledby="validar-label"
          className="flex h-11 flex-row items-center gap-6 pr-3 pl-3.5"
          value={decision}
          onValueChange={(v) => setDecision(v as DecisionValidacion)}
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="VALIDAR" />
            Validar
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="DEVOLVER" />
            Devolver
          </label>
        </RadioGroup>
      </Field>
      {devuelve && (
        <TextoLargo
          id="reintegracion-validar-observacion"
          label="Observación al devolver"
          required
          rows={4}
          max={OBSERVACION_MAX}
          value={observacion}
          error={s.intento ? errorObservacion : undefined}
          onChange={setObservacion}
        />
      )}
    </DialogoOperacionShell>
  )
}

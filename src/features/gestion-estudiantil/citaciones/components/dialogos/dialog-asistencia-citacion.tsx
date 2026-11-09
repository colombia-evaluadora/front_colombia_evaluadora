import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { Field, FieldLabel } from "@/components/ui/field"
import { CheckIcon } from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { useRegistrarAsistencia } from "@/features/gestion-estudiantil/citaciones/api/mutations/registrar-asistencia"
import type { CitacionRow, RegistrarAsistenciaInput } from "@/features/gestion-estudiantil/citaciones/api/types"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/citaciones/components/dialogos/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/citaciones/hooks/use-estado-dialogo"
import { ResumenCitacion } from "@/features/gestion-estudiantil/citaciones/components/dialogos/resumen-citacion"
import { enfocarPrimerError, errorLargo } from "@/features/gestion-estudiantil/convivencia/api/validaciones"
import { TextoLargo } from "@/features/gestion-estudiantil/convivencia/components/texto-largo"

interface Props {
  citacion: CitacionRow
  onClose: () => void
}

/**
 * Registrar asistencia (G.3.CIT.6, §4.1): Asistió / No asistió y el resumen de la reunión (10-2000, el backend lo
 * pide en ambos casos). El acudiente no ve el resumen. Solo quien atiende, y después de la fecha y hora.
 */
export function DialogAsistenciaCitacion({ citacion: c, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const [asistencia, setAsistencia] = useState<RegistrarAsistenciaInput["ASISTENCIA"]>("ASISTIO")
  const [resumen, setResumen] = useState("")
  const mut = useRegistrarAsistencia({
    mutationConfig: {
      onSuccess: () => {
        notify(
          asistencia === "ASISTIO"
            ? "Asistencia registrada. Puede crear un compromiso desde el menú de la citación."
            : "Inasistencia registrada.",
          { variant: "success" },
        )
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })
  const error = errorLargo(resumen, 10, 2000, "El resumen")

  return (
    <DialogoOperacionShell
      titulo={`Registrar asistencia — ${c.estudiante_nombre}`}
      resumen={<ResumenCitacion c={c} />}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{
        label: "Registrar",
        icon: <CheckIcon data-icon="inline-start" />,
        onClick: () => {
          s.setIntento(true)
          s.setError(null)
          if (error) {
            enfocarPrimerError()
            return
          }
          mut.mutate({ id: c.id, ASISTENCIA: asistencia, RESUMEN: resumen.trim() })
        },
      }}
    >
      <Field orientation="vertical" variant="outlined" className="gap-2" role="group" aria-labelledby="asistencia-label">
        <FieldLabel id="asistencia-label">Asistencia*</FieldLabel>
        <RadioGroup
          aria-labelledby="asistencia-label"
          className="flex h-11 flex-row items-center gap-6 pr-3 pl-3.5"
          value={asistencia}
          onValueChange={(v) => setAsistencia(v as RegistrarAsistenciaInput["ASISTENCIA"])}
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="ASISTIO" />
            Asistió
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="NO_ASISTIO" />
            No asistió
          </label>
        </RadioGroup>
      </Field>
      <div className="flex flex-col gap-1">
        <TextoLargo
          id="asistencia-resumen"
          label="Resumen de la reunión"
          required
          rows={4}
          max={2000}
          value={resumen}
          error={s.intento ? error : undefined}
          onChange={setResumen}
        />
        <p className="text-xs text-muted-foreground">El acudiente no ve este resumen.</p>
      </div>
    </DialogoOperacionShell>
  )
}

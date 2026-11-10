import { useState } from "react"
import { format } from "date-fns"

import { DatePicker } from "@/components/date-picker"
import { useNotify } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { CalendarDotsIcon, InfoIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"

import { useReprogramarCitacion } from "@/features/gestion-estudiantil/citaciones/api/mutations/reprogramar-citacion"
import type { CitacionRow } from "@/features/gestion-estudiantil/citaciones/api/types"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { ResumenCitacion } from "@/features/gestion-estudiantil/citaciones/components/dialogos/resumen-citacion"
import { errorFechaFutura, errorLugar } from "@/features/gestion-estudiantil/citaciones/utils/formularios"
import { formatFechaHora } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"

interface Props {
  citacion: CitacionRow
  onClose: () => void
}

/**
 * Reprogramar citación (§4.1, Regla 25): nueva fecha y, si cambia, nuevo lugar. La fecha y el lugar anteriores
 * quedan en el historial; el estado vuelve a Programada y se avisa al acudiente.
 */
export function DialogReprogramarCitacion({ citacion: c, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const [fecha, setFecha] = useState<Date | undefined>(undefined)
  const [lugar, setLugar] = useState(c.lugar ?? "")

  const mut = useReprogramarCitacion({
    mutationConfig: {
      onSuccess: () => {
        notify("Citación reprogramada; se avisó al acudiente.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  const errores = { fecha: errorFechaFutura(fecha), lugar: lugar.trim() ? errorLugar(lugar) : undefined }

  function reprogramar() {
    s.setIntento(true)
    s.setError(null)
    if (errores.fecha || errores.lugar) {
      enfocarPrimerError()
      return
    }
    mut.mutate({ id: c.id, FECHA: format(fecha as Date, "yyyy-MM-dd'T'HH:mm"), LUGAR: lugar.trim() || null })
  }

  return (
    <DialogoOperacionShell
      titulo={`Reprogramar citación — ${c.estudiante_nombre}`}
      resumen={<ResumenCitacion c={c} />}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{ label: "Reprogramar", icon: <CalendarDotsIcon data-icon="inline-start" />, onClick: reprogramar }}
    >
      <Alert>
        <InfoIcon aria-hidden="true" />
        <AlertDescription>
          Programación actual: {formatFechaHora(c.fecha_programada)}
          {c.lugar ? ` · ${c.lugar}` : ""}. Quedará en el historial de la citación.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
        <Field
          orientation="vertical"
          variant="outlined"
          className="gap-2"
          data-invalid={Boolean(s.intento && errores.fecha) || undefined}
        >
          <FieldLabel htmlFor="reprogramar-fecha">Nueva fecha y hora*</FieldLabel>
          <DatePicker
            id="reprogramar-fecha"
            mode="datetime"
            minDate={new Date()}
            value={fecha}
            aria-invalid={Boolean(s.intento && errores.fecha) || undefined}
            onChange={setFecha}
          />
          {s.intento && errores.fecha && <FieldError>{errores.fecha}</FieldError>}
        </Field>
        <Field
          orientation="vertical"
          variant="outlined"
          className="gap-2"
          data-invalid={Boolean(s.intento && errores.lugar) || undefined}
        >
          <FieldLabel htmlFor="reprogramar-lugar">Lugar</FieldLabel>
          <Input
            id="reprogramar-lugar"
            maxLength={150}
            value={lugar}
            aria-invalid={Boolean(s.intento && errores.lugar) || undefined}
            onChange={(e) => setLugar(e.target.value)}
          />
          <div className="flex justify-between">
            {s.intento && errores.lugar ? <FieldError>{errores.lugar}</FieldError> : <span />}
            <CharacterCounter value={lugar} max={150} />
          </div>
        </Field>
      </div>
    </DialogoOperacionShell>
  )
}

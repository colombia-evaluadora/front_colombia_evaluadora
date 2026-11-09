import { useState } from "react"
import { format } from "date-fns"

import { DatePicker } from "@/components/date-picker"
import { useNotify } from "@/components/notice/notice-context"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { CalendarDotsIcon, LockIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"

import { useProgramarCitacion } from "@/features/gestion-estudiantil/citaciones/api/mutations/programar-citacion"
import type { CitacionRow } from "@/features/gestion-estudiantil/citaciones/api/types"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/citaciones/components/dialogos/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/citaciones/hooks/use-estado-dialogo"
import { ResumenProgramar } from "@/features/gestion-estudiantil/citaciones/components/dialogos/resumen-citacion"
import { errorFechaFutura, errorLugar } from "@/features/gestion-estudiantil/citaciones/utils/formularios"
import { enfocarPrimerError, errorLargo } from "@/features/gestion-estudiantil/convivencia/api/validaciones"
import { TextoLargo } from "@/features/gestion-estudiantil/convivencia/components/texto-largo"

interface Props {
  citacion: CitacionRow
  onClose: () => void
}

/**
 * Programar citación (G.3.CIT.1, §4.1): pasa una citación Por programar a Programada con fecha y lugar. El texto
 * para el acudiente es de solo lectura cuando el sistema lo fija (`texto_fijo`); si no, se puede ajustar y
 * viaja en `TEXTO` (el backend lo rechaza con texto fijo).
 */
export function DialogProgramarCitacion({ citacion: c, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const [texto, setTexto] = useState(c.texto_acudiente ?? "")
  const [fecha, setFecha] = useState<Date | undefined>(undefined)
  const [lugar, setLugar] = useState(c.lugar ?? "")

  const mut = useProgramarCitacion({
    mutationConfig: {
      onSuccess: () => {
        notify(`Citación programada; se avisó a ${c.acudiente_nombre ?? "el acudiente"}.`, { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  const errores = {
    texto: c.texto_fijo ? undefined : errorLargo(texto, 10, 1000, "El texto para el acudiente"),
    fecha: errorFechaFutura(fecha),
    lugar: errorLugar(lugar),
  }

  function programar() {
    s.setIntento(true)
    s.setError(null)
    if (errores.texto || errores.fecha || errores.lugar) {
      enfocarPrimerError()
      return
    }
    mut.mutate({
      id: c.id,
      FECHA: format(fecha as Date, "yyyy-MM-dd'T'HH:mm"),
      LUGAR: lugar.trim(),
      TEXTO: c.texto_fijo ? null : texto.trim(),
    })
  }

  return (
    <DialogoOperacionShell
      titulo={`Programar citación — ${c.estudiante_nombre}`}
      resumen={<ResumenProgramar c={c} />}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{ label: "Programar", icon: <CalendarDotsIcon data-icon="inline-start" />, onClick: programar }}
    >
      {c.texto_fijo ? (
        <Field orientation="vertical" variant="outlined" className="gap-2">
          <FieldLabel htmlFor="programar-texto">Texto para el acudiente</FieldLabel>
          <Textarea id="programar-texto" rows={3} className={TEXTAREA_OUTLINED} readOnly disabled value={texto} />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <LockIcon aria-hidden className="size-3.5" />
            Texto fijo del sistema; no se puede editar.
          </p>
        </Field>
      ) : (
        <TextoLargo
          id="programar-texto"
          label="Texto para el acudiente"
          required
          max={1000}
          value={texto}
          error={s.intento ? errores.texto : undefined}
          onChange={setTexto}
        />
      )}

      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
        <Field
          orientation="vertical"
          variant="outlined"
          className="gap-2"
          data-invalid={Boolean(s.intento && errores.fecha) || undefined}
        >
          <FieldLabel htmlFor="programar-fecha">Fecha y hora*</FieldLabel>
          <DatePicker
            id="programar-fecha"
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
          <FieldLabel htmlFor="programar-lugar">Lugar*</FieldLabel>
          <Input
            id="programar-lugar"
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

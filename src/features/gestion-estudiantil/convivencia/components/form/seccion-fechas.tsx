import type { ReactNode } from "react"

import { DatePicker } from "@/components/date-picker"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

import { SiNo } from "@/features/gestion-estudiantil/convivencia/components/si-no"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import type { CasoFormState } from "@/features/gestion-estudiantil/convivencia/hooks/use-caso-form"

/** Fecha y hora de los hechos, fecha de conocimiento y, si se corrigen al modificar, el motivo. */
export function SeccionFechas({
  form,
  modal = false,
  valorActual,
}: {
  form: Pick<CasoFormState, "v" | "set" | "errores" | "fechasCambiaron">
  /** En el modal «Corregir fechas» las preguntas se acortan, el motivo se ve siempre y se muestra el valor actual. */
  modal?: boolean
  valorActual?: ReactNode
}) {
  const { v, set, errores, fechasCambiaron } = form
  return (
    <>
      {valorActual && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Valor actual:</span> {valorActual}
        </p>
      )}
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
        <SiNo
          id="caso-fecha-conocida"
          label={modal ? "¿Fecha conocida?" : "¿Se conoce la fecha de los hechos?"}
          required
          value={v.fechaConocida}
          error={errores.fechaConocida}
          onChange={(fechaConocida) =>
            set({ fechaConocida, ...(fechaConocida ? {} : { fechaHechos: "", horaConocida: null, hora: "" }) })
          }
        />
        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(errores.fechaHechos) || undefined}>
          <FieldLabel htmlFor="caso-fecha-hechos">Fecha de los hechos{v.fechaConocida && "*"}</FieldLabel>
          <DatePicker
            id="caso-fecha-hechos"
            disabled={!v.fechaConocida}
            placeholder={v.fechaConocida === false ? "Desconocida" : undefined}
            maxDate={new Date()}
            value={parseDateValue(v.fechaHechos)}
            onChange={(date) => set({ fechaHechos: date ? formatDateValue(date) : "" })}
          />
          {errores.fechaHechos ? (
            <FieldError>{errores.fechaHechos}</FieldError>
          ) : (
            <FieldDescription>No posterior a hoy ni a la Fecha de conocimiento.</FieldDescription>
          )}
        </Field>
        <Field
          orientation="vertical"
          variant="outlined"
          className="gap-2"
          data-invalid={Boolean(errores.fechaConocimiento) || undefined}
        >
          <FieldLabel htmlFor="caso-fecha-conocimiento">Fecha de conocimiento*</FieldLabel>
          <DatePicker
            id="caso-fecha-conocimiento"
            maxDate={new Date()}
            value={parseDateValue(v.fechaConocimiento)}
            onChange={(date) => set({ fechaConocimiento: date ? formatDateValue(date) : "" })}
          />
          {errores.fechaConocimiento ? (
            <FieldError>{errores.fechaConocimiento}</FieldError>
          ) : (
            <FieldDescription>
              {modal ? "No anterior a la Fecha de los hechos." : "Día en que el establecimiento conoció la situación."}
            </FieldDescription>
          )}
        </Field>
      </div>

      {/* Mismas 3 columnas que la fila de fechas: la hora queda debajo de «Fecha de los hechos». */}
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
        <SiNo
          id="caso-hora-conocida"
          label={modal ? "¿Hora conocida?" : "¿Se conoce la hora de los hechos?"}
          required={Boolean(v.fechaConocida)}
          disabled={!v.fechaConocida}
          value={v.horaConocida}
          error={errores.horaConocida}
          onChange={(horaConocida) => set({ horaConocida, ...(horaConocida ? {} : { hora: "" }) })}
        />
        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(errores.hora) || undefined}>
          <FieldLabel htmlFor="caso-hora">Hora de los hechos{v.horaConocida && "*"}</FieldLabel>
          <DatePicker
            id="caso-hora"
            mode="time"
            disabled={!v.fechaConocida || !v.horaConocida}
            placeholder={v.horaConocida === false ? "Hora desconocida" : undefined}
            value={v.hora}
            onChange={(hora) => set({ hora })}
          />
          {errores.hora ? <FieldError>{errores.hora}</FieldError> : <FieldDescription>Sin hora conocida no se asigna 00:00.</FieldDescription>}
        </Field>
      </div>

      {(fechasCambiaron || modal) && (
        <TextoLargo
          id="caso-motivo"
          label={modal ? "Motivo de la corrección" : "Motivo de la corrección de fechas"}
          descripcion="De 10 a 1000 caracteres."
          required
          max={1000}
          value={v.motivo}
          onChange={(motivo) => set({ motivo })}
          error={errores.motivo}
        />
      )}
    </>
  )
}

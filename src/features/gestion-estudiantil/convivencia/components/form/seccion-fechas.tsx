import { DatePicker } from "@/components/date-picker"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

import { SiNo } from "@/features/gestion-estudiantil/convivencia/components/si-no"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import type { CasoFormState } from "@/features/gestion-estudiantil/convivencia/hooks/use-caso-form"

/** Fecha y hora de los hechos, fecha de conocimiento y, si se corrigen al modificar, el motivo. */
export function SeccionFechas({ form }: { form: Pick<CasoFormState, "v" | "set" | "errores" | "fechasCambiaron"> }) {
  const { v, set, errores, fechasCambiaron } = form
  return (
    <>
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
        <SiNo
          id="caso-fecha-conocida"
          label="¿Se conoce la fecha de los hechos?"
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
          {errores.fechaHechos && <FieldError>{errores.fechaHechos}</FieldError>}
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
          {errores.fechaConocimiento && <FieldError>{errores.fechaConocimiento}</FieldError>}
        </Field>
      </div>

      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
        <SiNo
          id="caso-hora-conocida"
          label="¿Se conoce la hora de los hechos?"
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
          {errores.hora && <FieldError>{errores.hora}</FieldError>}
        </Field>
      </div>

      {fechasCambiaron && (
        <TextoLargo
          id="caso-motivo"
          label="Motivo de la corrección de fechas"
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

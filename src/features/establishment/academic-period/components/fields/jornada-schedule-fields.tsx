import { useSelector } from "@tanstack/react-form"

import { withForm } from "@/lib/forms"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InfoIcon, PlusIcon, TrashIcon } from "@/components/ui/icons"

import type { AcademicPeriodBreak } from "@/features/establishment/academic-period/api/types/academic-period"
import {
  getClassMinutes,
  getRecesoLocationLabel,
  getRecesoTimes,
  RECESO_LABEL_MAX,
} from "@/features/establishment/academic-period/utils/recesos"

// Campos que comparten el período y el grado con Personalizar horario (Regla 87).
export interface JornadaScheduleValues {
  scheduleStartTime: string
  scheduleEndTime: string
  defaultBlocksCount: number | null
  breaks: AcademicPeriodBreak[]
}

const SCHEDULE_DEFAULTS: JornadaScheduleValues = {
  scheduleStartTime: "",
  scheduleEndTime: "",
  defaultBlocksCount: null,
  breaks: [],
}

// Hora inicio, Hora final, Número de bloques y Recesos, con la duración de la
// hora de clase calculada (Regla 32).
export const JornadaScheduleFields = withForm({
  defaultValues: SCHEDULE_DEFAULTS,
  props: { blocksLabel: "Número de bloques de la jornada" },
  render: function Render({ form, blocksLabel }) {
    const schedule = useSelector(form.store, (state) => ({
      start: state.values.scheduleStartTime,
      end: state.values.scheduleEndTime,
      blocks: state.values.defaultBlocksCount,
      breaks: state.values.breaks,
    }))
    const classMinutes = getClassMinutes(
      schedule.start,
      schedule.end,
      schedule.blocks,
      schedule.breaks,
    )
    const recesoTimes = getRecesoTimes(
      schedule.start,
      schedule.end,
      schedule.blocks,
      schedule.breaks,
    )
    // Al inicio, después de los bloques 1 a N − 1 y al final (Regla 28).
    const locationOptions = [
      "INICIO",
      ...Array.from({ length: Math.max(0, (schedule.blocks ?? 0) - 1) }, (_, i) => String(i + 1)),
      "FINAL",
    ].map((value) => ({ value, label: getRecesoLocationLabel(value) }))

    return (
      <>
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-3">
          <form.AppField name="scheduleStartTime">
            {(field) => <field.TimeField label="Hora inicio" required />}
          </form.AppField>
          <form.AppField name="scheduleEndTime">
            {(field) => <field.TimeField label="Hora final" required />}
          </form.AppField>
          <form.AppField name="defaultBlocksCount">
            {(field) => (
              <field.NumberField
                label={blocksLabel}
                required
                valueAs="number"
                maxDigits={2}
                max={20}
              />
            )}
          </form.AppField>
        </div>

        <form.Field name="breaks" mode="array">
          {(breaksField) => (
            <fieldset className="mt-5 rounded-lg border border-border">
              <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
                <legend className="text-sm font-semibold">Recesos</legend>
                <Button
                  type="button"
                  size="sm"
                  variant="fill"
                  color="primary"
                  onClick={() =>
                    breaksField.pushValue({ label: "", location: "", durationMinutes: null })
                  }
                >
                  <PlusIcon data-icon="inline-start" />
                  Agregar receso
                </Button>
              </div>

              {breaksField.state.value.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">
                  Sin recesos: las horas de clase van seguidas de la Hora inicio a la Hora final.
                </p>
              ) : (
                <ul className="flex flex-col gap-4 px-4 pt-2 pb-4">
                  {breaksField.state.value.map((_, index) => (
                    <li
                      key={index}
                      className="grid items-start gap-x-3 gap-y-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.3fr)_0.8fr_0.9fr_auto]"
                    >
                      <form.AppField name={`breaks[${index}].label`}>
                        {(field) => (
                          <field.TextField
                            label="Etiqueta"
                            required
                            placeholder="Recreo, Almuerzo…"
                            maxLength={RECESO_LABEL_MAX}
                            showCounter
                          />
                        )}
                      </form.AppField>
                      <form.AppField name={`breaks[${index}].location`}>
                        {(field) => (
                          <field.SelectField label="Ubicación" required options={locationOptions} />
                        )}
                      </form.AppField>
                      <form.AppField name={`breaks[${index}].durationMinutes`}>
                        {(field) => (
                          <field.NumberField
                            label="Duración (min)"
                            required
                            valueAs="number"
                            maxDigits={3}
                          />
                        )}
                      </form.AppField>
                      <Field orientation="vertical" variant="outlined" className="w-full">
                        <FieldLabel htmlFor={`breaks-${index}-time`}>Hora</FieldLabel>
                        <Input
                          id={`breaks-${index}-time`}
                          value={
                            recesoTimes[index]
                              ? `${recesoTimes[index].startTime} – ${recesoTimes[index].endTime}`
                              : "—"
                          }
                          disabled
                          readOnly
                        />
                      </Field>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        color="destructive"
                        className="sm:mt-1.5"
                        onClick={() => breaksField.removeValue(index)}
                      >
                        <TrashIcon data-icon="inline-start" />
                        Eliminar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>
          )}
        </form.Field>

        <p className="mt-4 flex items-start gap-2 rounded-md border border-blue-stroke bg-blue-22 px-3 py-2 text-sm">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-blue" aria-hidden />
          {classMinutes != null ? (
            <span>
              Duración de la hora de clase: <strong>{Math.floor(classMinutes)} minutos</strong> (se
              calcula con las horas, los bloques y los recesos).
            </span>
          ) : (
            <span>
              La duración de la hora de clase se calcula al indicar la Hora inicio, la Hora final y
              el Número de bloques.
            </span>
          )}
        </p>
      </>
    )
  },
})

type ScheduleFormApi = Parameters<typeof JornadaScheduleFields>[0]["form"]

// El componente solo lee y escribe los cuatro campos de `JornadaScheduleValues`;
// TanStack no acepta un formulario con más campos aunque los tenga con el
// mismo nombre y tipo, así que el período y el grado lo pasan por aquí.
export function asScheduleForm<T extends JornadaScheduleValues>(form: { state: { values: T } }) {
  return form as unknown as ScheduleFormApi
}

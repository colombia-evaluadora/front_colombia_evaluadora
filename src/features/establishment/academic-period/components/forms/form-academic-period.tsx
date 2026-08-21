import { useEffect, useRef } from "react"
import { useForm, useSelector } from "@tanstack/react-form"

import { Badge } from "@/components/ui/badge"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input, inputVariants } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { BreaksField } from "@/features/establishment/academic-period/components/breaks-field"

import { useSedeOptionsQuery } from "@/features/establishment/academic-period/api/query/use-sede-options"

import { useAcademicPeriodStatusesQuery } from "@/features/establishment/academic-period/api/query/use-academic-period-statuses"
import { useJornadasQuery } from "@/features/establishment/academic-period/api/query/use-jornadas"
import { useSedePreviousPeriodsQuery } from "@/features/establishment/academic-period/api/query/use-sede-previous-periods-query"
import {
  academicPeriodFormSchema,
  type AcademicPeriodFormInput,
  type AcademicPeriodFormValues,
} from "../../api/schema"
import { ACADEMIC_PERIOD_STATUS_BADGE } from "../../api/ui-mappings"
import { DatePicker } from "@/components/date-picker"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

interface AcademicPeriodFormProps {
  id: string
  defaultValues?: Partial<AcademicPeriodFormInput>
  onSubmit: (values: AcademicPeriodFormValues) => void
  onDirtyChange?: (isDirty: boolean) => void
  onValidChange?: (isValid: boolean) => void
  savedToken?: number
  /** Id del periodo en edición: se excluye de las opciones de "periodo
   *  anterior" (un periodo no puede ser su propio anterior). */
  currentPeriodId?: number
}

const EMPTY_VALUES: AcademicPeriodFormInput = {
  startDate: "",
  endDate: "",
  enrollmentDeadline: "",
  sedeId: "",
  previousPeriodId: null,
  statusId: 0,
  jornadaId: 0,
  reservationEnabled: true,
  defaultBlocksCount: null,
  scheduleStartTime: "",
  scheduleEndTime: "",
  breaks: [],
}

const NO_PREVIOUS_PERIOD = "none"

export function AcademicPeriodForm({
  id,
  defaultValues,
  onSubmit,
  onDirtyChange,
  onValidChange,
  savedToken = 0,
  currentPeriodId,
}: AcademicPeriodFormProps) {
  const initialValues = {
    ...EMPTY_VALUES,
    ...defaultValues,
  } satisfies AcademicPeriodFormInput

  const { data: sedes = [] } = useSedeOptionsQuery()
  const { data: jornadas = [] } = useJornadasQuery()
  const { data: statusOptions = [] } = useAcademicPeriodStatusesQuery()

  const form = useForm({
    defaultValues: initialValues,
    validators: {
      onChange: academicPeriodFormSchema,
      onSubmit: academicPeriodFormSchema,
    },
    onSubmit: ({ value }) => {
      onSubmit(academicPeriodFormSchema.parse(value))
    },
  })

  const isDefaultValue = useSelector(form.store, (state) => state.isDefaultValue)

  useEffect(() => {
    onDirtyChange?.(!isDefaultValue)
  }, [isDefaultValue, onDirtyChange])


  const isFormValid = useSelector(
    form.store,
    (state) => academicPeriodFormSchema.safeParse(state.values).success,
  )

  useEffect(() => {
    onValidChange?.(isFormValid)
  }, [isFormValid, onValidChange])

  const lastSavedToken = useRef(savedToken)
  useEffect(() => {
    if (lastSavedToken.current === savedToken) return
    lastSavedToken.current = savedToken
    form.reset(form.state.values)
  }, [form, savedToken])

  const selectedSedeId = useSelector(form.store, (state) => state.values.sedeId)
  const { data: previousPeriodOptions = [] } = useSedePreviousPeriodsQuery(
    selectedSedeId || undefined,
    currentPeriodId
  )

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Fila 1: fechas */}
        <form.Field name="startDate">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Inicio del período académico*</FieldLabel>
                <DatePicker
                  mode="date"
                  id={field.name}
                  value={parseDateValue(field.state.value)}
                  onChange={(date) => {
                    field.handleChange(formatDateValue(date))
                    field.handleBlur()
                  }}
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="endDate">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Fin del período académico*</FieldLabel>
                <DatePicker
                  mode="date"
                  id={field.name}
                  value={parseDateValue(field.state.value)}
                  onChange={(date) => {
                    field.handleChange(formatDateValue(date))
                    field.handleBlur()
                  }}
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="enrollmentDeadline">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <form.Subscribe
                selector={(state) => ({
                  startDate: state.values.startDate,
                  endDate: state.values.endDate,
                })}
              >
                {({ startDate, endDate }) => {
                  const start = parseDateValue(startDate)
                  const end = parseDateValue(endDate)
                  const current = parseDateValue(field.state.value)
                  const outOfRange =
                    !!current && ((!!start && current < start) || (!!end && current > end))
                  return (
                    <Field variant="outlined" data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Fecha límite de matrícula*</FieldLabel>
                      <DatePicker
                        mode="date"
                        id={field.name}
                        value={parseDateValue(field.state.value)}
                        onChange={(date) => {
                          field.handleChange(formatDateValue(date))
                          field.handleBlur()
                        }}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : outOfRange ? (
                        <p role="alert" className="text-muted-foreground text-xs">
                          La fecha límite de matrícula debe estar entre la fecha de inicio y la
                          fecha de fin del período.
                        </p>
                      ) : null}
                    </Field>
                  )
                }}
              </form.Subscribe>
            )
          }}
        </form.Field>

        {/* Fila 2: sede, periodo anterior, estado */}
        <form.Field name="sedeId">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Sede*</FieldLabel>
                <ComboboxField
                  value={field.state.value || ""}
                  onValueChange={(value) => value && field.handleChange(value)}
                >
                  <ComboboxFieldTrigger id={field.name} aria-invalid={isInvalid}>
                    <ComboboxFieldValue>
                      {(value) => sedes.find((s) => String(s.pk_sede) === value)?.nombre ?? "Seleccionar"}
                    </ComboboxFieldValue>
                  </ComboboxFieldTrigger>
                  <ComboboxFieldContent>
                    <ComboboxGroup>
                      {sedes.map((sede) => (
                        <ComboboxFieldItem
                          key={sede.pk_sede}
                          value={String(sede.pk_sede)}
                          title={sede.nombre}
                        >
                          {sede.nombre}
                        </ComboboxFieldItem>
                      ))}
                    </ComboboxGroup>
                  </ComboboxFieldContent>
                </ComboboxField>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>
        <form.Field name="previousPeriodId">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>Periodo académico anterior</FieldLabel>
              <ComboboxField
                value={field.state.value ? String(field.state.value) : NO_PREVIOUS_PERIOD}
                onValueChange={(value) =>
                  field.handleChange(
                    value && value !== NO_PREVIOUS_PERIOD ? Number(value) : null,
                  )
                }
              >
                <ComboboxFieldTrigger id={field.name}>
                  <ComboboxFieldValue>
                    {(value) => {
                      const p = previousPeriodOptions.find((o) => String(o.id) === value)
                      return p ? p.name : "No tiene"
                    }}
                  </ComboboxFieldValue>
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                  <ComboboxGroup>
                    <ComboboxFieldItem value={NO_PREVIOUS_PERIOD}>No tiene</ComboboxFieldItem>
                    {previousPeriodOptions.map((period) => (
                      <ComboboxFieldItem key={period.id} value={String(period.id)}>
                        {period.name}
                      </ComboboxFieldItem>
                    ))}
                  </ComboboxGroup>
                </ComboboxFieldContent>
              </ComboboxField>
            </Field>
          )}
        </form.Field>

        <form.Field name="statusId">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Estado*</FieldLabel>
                <Select
                  value={field.state.value ? String(field.state.value) : ""}
                  onValueChange={(value) => value && field.handleChange(Number(value))}
                  // `onBlur` en el trigger disparaba `handleBlur` apenas se
                  // abría el popup (el foco se mueve a la lista), marcando
                  // `isTouched` — y por lo tanto el borde/mensaje en rojo—
                  // mientras el usuario todavía estaba eligiendo una opción.
                  // Acá se marca "tocado" recién al cerrarse el popup, sea
                  // porque se eligió algo o porque se hizo click afuera.
                  onOpenChange={(nextOpen) => {
                    if (!nextOpen) field.handleBlur()
                  }}
                >
                  <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                    <SelectValue>
                      {(value) => {
                        const option = statusOptions.find(
                          (o) => String(o.id) === value
                        )
                        if (!option) return "Seleccionar"
                        const badge = ACADEMIC_PERIOD_STATUS_BADGE[option.key]
                        return <Badge {...badge} className="text-xs">{option.label}</Badge>
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.id} value={String(option.id)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        {/* Fila 3: jornada, hora inicio, hora final */}
        <form.Field name="jornadaId">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Jornada*</FieldLabel>
                <ComboboxField
                  value={field.state.value ? String(field.state.value) : ""}
                  onValueChange={(value) => value && field.handleChange(Number(value))}
                >
                  <ComboboxFieldTrigger id={field.name} aria-invalid={isInvalid}>
                    <ComboboxFieldValue>
                      {(value) =>
                        jornadas.find((j) => String(j.id) === value)?.name ?? "Seleccionar"
                      }
                    </ComboboxFieldValue>
                  </ComboboxFieldTrigger>
                  <ComboboxFieldContent>
                    <ComboboxGroup>
                      {jornadas.map((jornada) => (
                        <ComboboxFieldItem key={jornada.id} value={String(jornada.id)}>
                          {jornada.name}
                        </ComboboxFieldItem>
                      ))}
                    </ComboboxGroup>
                  </ComboboxFieldContent>
                </ComboboxField>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="scheduleStartTime">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <form.Subscribe selector={(state) => state.values.scheduleEndTime}>
                {(scheduleEndTime) => {
                  const outOfRange =
                    !!field.state.value && !!scheduleEndTime && field.state.value >= scheduleEndTime
                  return (
                    <Field variant="outlined" data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Hora inicio*</FieldLabel>
                      <DatePicker
                        mode="time"
                        id={field.name}
                        value={field.state.value}
                        onChange={(value) => {
                          field.handleChange(value)
                          field.handleBlur()
                        }}
                        placeholder="Agregar"
                        aria-invalid={isInvalid}
                      />
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : outOfRange ? (
                        <p role="alert" className="text-muted-foreground text-xs">
                          La hora de inicio no puede ser posterior o igual a la hora final.
                        </p>
                      ) : null}
                    </Field>
                  )
                }}
              </form.Subscribe>
            )
          }}
        </form.Field>

        <form.Field name="scheduleEndTime">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Hora final*</FieldLabel>
                <DatePicker
                  mode="time"
                  id={field.name}
                  value={field.state.value}
                  onChange={(value) => {
                    field.handleChange(value)
                    field.handleBlur()
                  }}
                  placeholder="Agregar"
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        {/* Fila 4: bloques, descansos, reserva */}
        <form.Field name="defaultBlocksCount">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Número de bloques de la jornada*</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Agregar"
                  value={field.state.value ?? ""}
                  onBlur={field.handleBlur}
                  aria-invalid={isInvalid}
                  onKeyDown={(e) => {
                    if (["-", "+", ".", ",", "e", "E"].includes(e.key)) {
                      e.preventDefault()
                    }
                  }}
                  onChange={(e) =>
                    field.handleChange(
                      Number.isNaN(e.target.valueAsNumber) ? null : e.target.valueAsNumber,
                    )
                  }
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="breaks" mode="array">
          {(field) => (
            <form.Subscribe
              selector={(state) => ({
                scheduleStartTime: state.values.scheduleStartTime,
                scheduleEndTime: state.values.scheduleEndTime,
              })}
            >
              {({ scheduleStartTime, scheduleEndTime }) => {
                const breaks = field.state.value
                const hasInvalidBreak = breaks.some(
                  (b) =>
                    !b.startTime ||
                    !b.endTime ||
                    b.startTime >= b.endTime ||
                    (scheduleStartTime && b.startTime < scheduleStartTime) ||
                    (scheduleEndTime && b.endTime > scheduleEndTime),
                )
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field variant="outlined" data-invalid={isInvalid}>
                    <FieldLabel>Cantidad y horarios de descanso</FieldLabel>
                    <BreaksField
                      value={field.state.value}
                      onAdd={(brk) => field.pushValue(brk)}
                      onRemove={(index) => field.removeValue(index)}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : hasInvalidBreak ? (
                      <p role="alert" className="text-muted-foreground text-xs">
                        Los descansos deben estar entre la hora de inicio y la hora final de la
                        jornada, y la hora de inicio del descanso no puede ser posterior a su hora
                        final.
                      </p>
                    ) : null}
                  </Field>
                )
              }}
            </form.Subscribe>
          )}
        </form.Field>

        <form.Field name="reservationEnabled">
          {(field) => (
            <label
              htmlFor={field.name}
              className={cn(
                inputVariants({ variant: "outlined" }),
                "mt-2 flex cursor-pointer items-center justify-between gap-2",
              )}
            >
              <span className="text-sm">Habilitar reserva de cupos</span>
              <Switch
                id={field.name}
                checked={field.state.value}
                onCheckedChange={(checked) => field.handleChange(checked)}
                className="rounded-full [&_[data-slot=switch-thumb]]:rounded-full"
              />
            </label>
          )}
        </form.Field>
      </div>
    </form>
  )
}

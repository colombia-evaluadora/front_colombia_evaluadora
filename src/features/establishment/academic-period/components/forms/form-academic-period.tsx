import { useEffect, useRef, useState } from "react"
import { addDays } from "date-fns"
import { useSelector } from "@tanstack/react-form"
import { isFieldInvalid, useAppForm } from "@/lib/forms"

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

import { BreaksField } from "@/features/establishment/academic-period/components/fields/breaks-field"

import { useSedeOptionsQuery } from "@/features/establishment/academic-period/api/query/use-sede-options"

import { useAcademicPeriodStatusesQuery, useJornadasQuery } from "@/features/establishment/academic-period/api/query/catalogos-lista-valor"
import { usePredeterminadoQuery } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { useSedePreviousPeriodsQuery } from "@/features/establishment/academic-period/api/query/use-sede-previous-periods-query"
import { useAcademicPeriodQuery } from "@/features/establishment/academic-period/api/query/use-academic-period"
import {
  academicPeriodFormSchema,
  addOneMinute,
  timeToMinutes,
  type AcademicPeriodFormInput,
  type AcademicPeriodFormValues,
} from "../../api/schema"
import { DatePicker } from "@/components/date-picker"
import { parseDateValue } from "@/lib/date-value"

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
  const isCreating = currentPeriodId == null

  const form = useAppForm({
    defaultValues: initialValues,
    validators: {
      onChange: academicPeriodFormSchema,
      onSubmit: academicPeriodFormSchema,
    },
    onSubmit: ({ value }) => {
      onSubmit(academicPeriodFormSchema.parse(value))
    },
  })

  // Aviso cuando se rechaza una hora de jornada inválida (inicio >= final).
  const [horaError, setHoraError] = useState<string | null>(null)

  const isDefaultValue = useSelector(form.store, (state) => state.isDefaultValue)
  const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts)

  useEffect(() => {
    onDirtyChange?.(!isDefaultValue)
  }, [isDefaultValue, onDirtyChange])

  // Al crear, el periodo siempre arranca en "Inscripciones" — solo se puede
  // cambiar de estado después, editando el periodo ya creado.
  useEffect(() => {
    if (!isCreating || form.state.values.statusId) return
    const inscripciones = statusOptions.find((o) => o.key === "I")
    if (inscripciones) form.setFieldValue("statusId", inscripciones.id)
  }, [isCreating, statusOptions, form])

  // Al crear, jornada arranca en el predeterminado de Listas valor (si hay).
  const { data: jornadaPredeterminada } = usePredeterminadoQuery("JORNADA")
  useEffect(() => {
    if (!isCreating || !jornadaPredeterminada || form.state.values.jornadaId) return
    form.setFieldValue("jornadaId", jornadaPredeterminada.pk_lista_valor)
  }, [isCreating, jornadaPredeterminada, form])


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

  // El anterior guardado puede no venir en los candidatos (p.ej. inactivo);
  // se consulta aparte solo para mostrar su etiqueta.
  const selectedPreviousPeriodId = useSelector(
    form.store,
    (state) => state.values.previousPeriodId,
  )
  const previousPeriodMissing =
    selectedPreviousPeriodId != null &&
    !previousPeriodOptions.some((option) => option.id === selectedPreviousPeriodId)
  const { data: missingPreviousPeriod } = useAcademicPeriodQuery(
    previousPeriodMissing ? selectedPreviousPeriodId : undefined,
  )
  const previousPeriodOptionsWithSelected = (() => {
    if (!missingPreviousPeriod) return previousPeriodOptions
    return [...previousPeriodOptions, { id: missingPreviousPeriod.id, name: missingPreviousPeriod.name }]
  })()

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
        <form.AppField name="startDate">
          {(field) => <field.DateField label="Inicio del período académico" required />}
        </form.AppField>

        <form.Subscribe selector={(state) => state.values.startDate}>
          {(startDate) => (
            <form.AppField name="endDate">
              {(field) => (
                <field.DateField
                  label="Fin del período académico"
                  required
                  minDate={startDate ? addDays(parseDateValue(startDate) as Date, 1) : undefined}
                />
              )}
            </form.AppField>
          )}
        </form.Subscribe>

        <form.Subscribe
          selector={(state) => ({
            startDate: state.values.startDate,
            endDate: state.values.endDate,
          })}
        >
          {({ startDate, endDate }) => (
            <form.AppField name="enrollmentDeadline">
              {(field) => (
                <field.DateField
                  label="Fecha límite de matrícula"
                  required
                  minDate={parseDateValue(startDate)}
                  maxDate={parseDateValue(endDate)}
                />
              )}
            </form.AppField>
          )}
        </form.Subscribe>

        {/* Fila 2: sede, periodo anterior, estado */}
        <form.Field name="sedeId">
          {(field) => {
            const isInvalid = isFieldInvalid(field, submissionAttempts)
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
          {(field) => {
            const isInvalid = isFieldInvalid(field, submissionAttempts)
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Periodo académico anterior</FieldLabel>
                <ComboboxField
                  value={field.state.value ? String(field.state.value) : NO_PREVIOUS_PERIOD}
                  onValueChange={(value) =>
                    field.handleChange(
                      value && value !== NO_PREVIOUS_PERIOD ? Number(value) : null,
                    )
                  }
                >
                  <ComboboxFieldTrigger id={field.name} aria-invalid={isInvalid}>
                    <ComboboxFieldValue>
                      {(value) => {
                        const p = previousPeriodOptionsWithSelected.find(
                          (o) => String(o.id) === value,
                        )
                        return p ? p.name : "No tiene"
                      }}
                    </ComboboxFieldValue>
                  </ComboboxFieldTrigger>
                  <ComboboxFieldContent>
                    <ComboboxGroup>
                      <ComboboxFieldItem value={NO_PREVIOUS_PERIOD}>No tiene</ComboboxFieldItem>
                      {previousPeriodOptionsWithSelected.map((period) => (
                        <ComboboxFieldItem key={period.id} value={String(period.id)}>
                          {period.name}
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

        <form.Field name="statusId">
          {(field) => {
            const isInvalid = isFieldInvalid(field, submissionAttempts)
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Estado*</FieldLabel>
                <Select
                  value={field.state.value ? String(field.state.value) : ""}
                  onValueChange={(value) => value && field.handleChange(Number(value))}
                  disabled={isCreating}
                  // Se marca tocado al cerrar el popup, no en blur (el foco pasa a la lista).
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
                        return option.label
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
            const isInvalid = isFieldInvalid(field, submissionAttempts)
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
            const isInvalid = isFieldInvalid(field, submissionAttempts)
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
                          // Sin hora final (o inicio >= final) la final se ajusta a +1 minuto.
                          if (!scheduleEndTime || value >= scheduleEndTime) {
                            const nextEnd = addOneMinute(value)
                            if (!nextEnd) {
                              setHoraError("La hora de inicio debe ser anterior a las 11:59 pm.")
                              return
                            }
                            form.setFieldValue("scheduleEndTime", nextEnd)
                          }
                          setHoraError(null)
                          field.handleChange(value)
                          field.handleBlur()
                        }}
                        onClose={() => document.getElementById("scheduleEndTime")?.focus()}
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
            const isInvalid = isFieldInvalid(field, submissionAttempts)
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Hora final*</FieldLabel>
                <form.Subscribe selector={(state) => state.values.scheduleStartTime}>
                  {(scheduleStartTime) => (
                    <>
                      <DatePicker
                        mode="time"
                        id={field.name}
                        value={field.state.value}
                        onChange={(value) => {
                          // No se acepta una hora final igual o anterior al inicio.
                          if (scheduleStartTime && value <= scheduleStartTime) {
                            setHoraError("La hora final debe ser posterior a la hora de inicio.")
                            return
                          }
                          setHoraError(null)
                          field.handleChange(value)
                          field.handleBlur()
                        }}
                        placeholder="Agregar"
                        aria-invalid={isInvalid}
                      />
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : horaError ? (
                        <p role="alert" className="text-red text-xs">
                          {horaError}
                        </p>
                      ) : null}
                    </>
                  )}
                </form.Subscribe>
              </Field>
            )
          }}
        </form.Field>

        {/* Fila 4: bloques, descansos, reserva */}
        <form.Field name="defaultBlocksCount">
          {(field) => {
            const isInvalid = isFieldInvalid(field, submissionAttempts)
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Número de bloques de la jornada*</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  min={1}
                  max={20}
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
                  onChange={(e) => {
                    if (e.target.value.length > 2) return
                    field.handleChange(
                      Number.isNaN(e.target.valueAsNumber) ? null : e.target.valueAsNumber,
                    )
                  }}
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
                    timeToMinutes(b.startTime) >= timeToMinutes(b.endTime) ||
                    (scheduleStartTime && timeToMinutes(b.startTime) < timeToMinutes(scheduleStartTime)) ||
                    (scheduleEndTime && timeToMinutes(b.endTime) > timeToMinutes(scheduleEndTime)),
                )
                const isInvalid = isFieldInvalid(field, submissionAttempts)
                return (
                  <Field variant="outlined" data-invalid={isInvalid}>
                    <FieldLabel>Cantidad y horarios de descanso</FieldLabel>
                    <BreaksField
                      minTime={scheduleStartTime || undefined}
                      maxTime={scheduleEndTime || undefined}
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

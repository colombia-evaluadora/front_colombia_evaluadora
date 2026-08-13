import { useEffect, useRef } from "react"
import { useForm, useStore } from "@tanstack/react-form"

import { Badge } from "@/components/ui/badge"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input, inputVariants } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { BreaksField } from "@/features/establishment/academic-period/components/breaks-field"

import { useCampusesOptionsQuery } from "@/features/establishment/campuses/api/query/use-campuses-options"

import { useAcademicPeriodsQuery } from "@/features/establishment/academic-period/api/query/use-academic-periods"
import { useAcademicPeriodStatusesQuery } from "@/features/establishment/academic-period/api/query/use-academic-period-statuses"
import { useJornadasQuery } from "@/features/establishment/academic-period/api/query/use-jornadas"
import {
  academicPeriodFormSchema,
  type AcademicPeriodFormInput,
  type AcademicPeriodFormValues,
} from "@/features/establishment/academic-period/api/schema"
import type { AcademicPeriodStatus } from "@/features/establishment/academic-period/api/types/academic-period"
import { ACADEMIC_PERIOD_STATUS_BADGE } from "@/features/establishment/academic-period/api/ui-mappings"
import { DatePicker } from "@/components/date-picker"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

interface AcademicPeriodFormProps {
  id: string
  defaultValues?: Partial<AcademicPeriodFormInput>
  onSubmit: (values: AcademicPeriodFormValues) => void
  /** Avisa si los valores actuales difieren de los iniciales, para que quien
   *  renderiza las acciones solo muestre "Guardar" cuando haya cambios. */
  onDirtyChange?: (isDirty: boolean) => void
  /** Cada vez que cambia, los valores actuales pasan a ser los iniciales
   *  (se usa tras guardar con éxito, para volver a ocultar "Guardar"). */
  savedToken?: number
}

const EMPTY_VALUES: AcademicPeriodFormInput = {
  startDate: "",
  endDate: "",
  enrollmentDeadline: "",
  sedeId: "",
  previousPeriodId: null,
  status: "ACTIVO",
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
  savedToken = 0,
}: AcademicPeriodFormProps) {
  const initialValues = {
    ...EMPTY_VALUES,
    ...defaultValues,
  } satisfies AcademicPeriodFormInput

  const { data: campuses = [] } = useCampusesOptionsQuery()
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

  // `isDefaultValue` vuelve a ser true si el usuario deshace sus cambios, así
  // el botón desaparece igual que si nunca hubiera tocado el formulario.
  const isDefaultValue = useStore(form.store, (state) => state.isDefaultValue)

  useEffect(() => {
    onDirtyChange?.(!isDefaultValue)
  }, [isDefaultValue, onDirtyChange])

  const lastSavedToken = useRef(savedToken)
  useEffect(() => {
    if (lastSavedToken.current === savedToken) return
    lastSavedToken.current = savedToken
    form.reset(form.state.values)
  }, [form, savedToken])

  const { data: periodsData } = useAcademicPeriodsQuery({
    filters: {},
    sorting: [],
    pageIndex: 0,
    pageSize: 100,
  })
  const previousPeriodOptions = periodsData?.rows ?? []

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
                <Select
                  value={field.state.value || ""}
                  onValueChange={(value) => value && field.handleChange(value)}
                >
                  <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                    <SelectValue>
                      {(value) => campuses.find((c) => c.id === value)?.name ?? "Seleccionar"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {campuses.map((campus) => (
                        <SelectItem key={campus.id} value={campus.id}>
                          {campus.name}
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

        {/* Periodo anterior: se consulta por la sede seleccionada e incluye
            siempre la opción "No tiene" (equivale a null). El form maneja
            `sedeId` como string, igual que `AcademicPeriod.sedeId` y
            `Campus.id`. */}
        <form.Subscribe selector={(state) => state.values.sedeId}>
          {(sedeId) => {
            const optionsForSede = previousPeriodOptions.filter((p) => p.sedeId === sedeId)
            return (
              <form.Field name="previousPeriodId">
                {(field) => (
                  <Field variant="outlined">
                    <FieldLabel htmlFor={field.name}>Periodo académico anterior</FieldLabel>
                    <Select
                      value={field.state.value ? String(field.state.value) : NO_PREVIOUS_PERIOD}
                      onValueChange={(value) =>
                        field.handleChange(
                          value && value !== NO_PREVIOUS_PERIOD ? Number(value) : null,
                        )
                      }
                    >
                      <SelectTrigger id={field.name}>
                        <SelectValue>
                          {(value) => {
                            const p = optionsForSede.find((o) => String(o.id) === value)
                            return p ? `${p.name} — ${p.sedeName}` : "No tiene"
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value={NO_PREVIOUS_PERIOD}>No tiene</SelectItem>
                          {optionsForSede.map((period) => (
                            <SelectItem key={period.id} value={String(period.id)}>
                              {period.name} — {period.sedeName}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </form.Field>
            )
          }}
        </form.Subscribe>

        <form.Field name="status">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>Estado*</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(value) =>
                  value && field.handleChange(value as AcademicPeriodStatus)
                }
              >
                <SelectTrigger id={field.name}>
                  {/* El valor elegido se muestra como el mismo badge soft que
                      usa la columna Estado de la tabla, para que el estado se
                      lea igual en el formulario y en el listado. */}
                  <SelectValue>
                    {(value) => {
                      const status = value as AcademicPeriodStatus
                      const badge = ACADEMIC_PERIOD_STATUS_BADGE[status]
                      if (!badge) return "Seleccionar"
                      const label =
                        statusOptions.find((option) => option.key === status)?.label ?? status
                      return (
                        <Badge {...badge} className="text-xs">
                          {label}
                        </Badge>
                      )
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        {/* Fila 3: jornada, hora inicio, hora final */}
        <form.Field name="jornadaId">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Jornada*</FieldLabel>
                <Select
                  value={field.state.value ? String(field.state.value) : ""}
                  onValueChange={(value) => value && field.handleChange(Number(value))}
                >
                  <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                    <SelectValue>
                      {(value) =>
                        jornadas.find((j) => String(j.id) === value)?.name ?? "Seleccionar"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {jornadas.map((jornada) => (
                        <SelectItem key={jornada.id} value={String(jornada.id)}>
                          {jornada.name}
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
                  placeholder="Agregar"
                  value={field.state.value ?? ""}
                  onBlur={field.handleBlur}
                  aria-invalid={isInvalid}
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

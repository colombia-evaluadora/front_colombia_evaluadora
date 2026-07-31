import { useForm } from "@tanstack/react-form"

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

import { BreaksField } from "./breaks-field"

import { useAcademicPeriodsQuery } from "../../api/query/academic-period/use-academic-periods-query"
import {
  academicPeriodFormSchema,
  type AcademicPeriodFormInput,
  type AcademicPeriodFormValues,
} from "../../api/schema"
import {
  ACADEMIC_PERIOD_STATUS_LABELS,
  JORNADA_OPTIONS,
  SEDE_OPTIONS,
} from "../../api/ui-mappings"
import type { AcademicPeriodStatus } from "../../api/types/academic-period"
import { DatePicker } from "@/components/date-picker"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

interface AcademicPeriodFormProps {
  id: string
  defaultValues?: Partial<AcademicPeriodFormInput>
  onSubmit: (values: AcademicPeriodFormValues) => void
}

const EMPTY_VALUES: AcademicPeriodFormInput = {
  startDate: "",
  endDate: "",
  enrollmentDeadline: "",
  sedeId: 0,
  previousPeriodId: null,
  status: "ACTIVO",
  jornadaId: 0,
  reservationEnabled: true,
  defaultBlocksCount: null,
  scheduleStartTime: "",
  scheduleEndTime: "",
  breaks: [],
}

const STATUS_OPTIONS = Object.keys(
  ACADEMIC_PERIOD_STATUS_LABELS
) as AcademicPeriodStatus[]

const NO_PREVIOUS_PERIOD = "none"

export function AcademicPeriodForm({
  id,
  defaultValues,
  onSubmit,
}: AcademicPeriodFormProps) {
  const initialValues = {
    ...EMPTY_VALUES,
    ...defaultValues,
  } satisfies AcademicPeriodFormInput

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
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  Inicio del período académico*
                </FieldLabel>
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
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  Fin del período académico*
                </FieldLabel>
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
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  Fecha límite de matrícula*
                </FieldLabel>
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

        {/* Fila 2: sede, periodo anterior, estado */}
        <form.Field name="sedeId">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Sede*</FieldLabel>
                <Select
                  value={field.state.value ? String(field.state.value) : ""}
                  onValueChange={(value) =>
                    value && field.handleChange(Number(value))
                  }
                >
                  <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                    <SelectValue placeholder="Seleccionar">
                      {(value) =>
                        SEDE_OPTIONS.find((s) => String(s.id) === value)?.name ??
                        "Seleccionar"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {SEDE_OPTIONS.map((sede) => (
                        <SelectItem key={sede.id} value={String(sede.id)}>
                          {sede.name}
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
            siempre la opción "No tiene" (equivale a null). */}
        <form.Subscribe selector={(state) => state.values.sedeId}>
          {(sedeId) => {
            const optionsForSede = previousPeriodOptions.filter(
              (p) => p.sedeId === sedeId
            )
            return (
              <form.Field name="previousPeriodId">
                {(field) => (
                  <Field variant="outlined">
                    <FieldLabel htmlFor={field.name}>
                      Periodo académico anterior
                    </FieldLabel>
                    <Select
                      value={
                        field.state.value
                          ? String(field.state.value)
                          : NO_PREVIOUS_PERIOD
                      }
                      onValueChange={(value) =>
                        field.handleChange(
                          value && value !== NO_PREVIOUS_PERIOD
                            ? Number(value)
                            : null
                        )
                      }
                    >
                      <SelectTrigger id={field.name}>
                        <SelectValue placeholder="No tiene">
                          {(value) => {
                            const p = optionsForSede.find(
                              (o) => String(o.id) === value
                            )
                            return p ? `${p.name} — ${p.sedeName}` : "No tiene"
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value={NO_PREVIOUS_PERIOD}>
                            No tiene
                          </SelectItem>
                          {optionsForSede.map((period) => (
                            <SelectItem
                              key={period.id}
                              value={String(period.id)}
                            >
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
                  <SelectValue placeholder="Seleccionar">
                    {(value) =>
                      value
                        ? ACADEMIC_PERIOD_STATUS_LABELS[
                            value as AcademicPeriodStatus
                          ]
                        : "Seleccionar"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {ACADEMIC_PERIOD_STATUS_LABELS[option]}
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
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Jornada*</FieldLabel>
                <Select
                  value={field.state.value ? String(field.state.value) : ""}
                  onValueChange={(value) =>
                    value && field.handleChange(Number(value))
                  }
                >
                  <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                    <SelectValue placeholder="Seleccionar">
                      {(value) =>
                        JORNADA_OPTIONS.find((j) => String(j.id) === value)
                          ?.name ?? "Seleccionar"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {JORNADA_OPTIONS.map((jornada) => (
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
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
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
                  placeholder="Seleccione una hora"
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="scheduleEndTime">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
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
                  placeholder="Seleccione una hora"
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
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field variant="outlined" data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  Número de bloques de la jornada*
                </FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  min={1}
                  placeholder="Ingrese la cantidad"
                  value={field.state.value ?? ""}
                  onBlur={field.handleBlur}
                  aria-invalid={isInvalid}
                  onChange={(e) =>
                    field.handleChange(
                      Number.isNaN(e.target.valueAsNumber)
                        ? null
                        : e.target.valueAsNumber
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
            <Field variant="outlined">
              <FieldLabel>Cantidad y horarios de descanso</FieldLabel>
              <BreaksField
                value={field.state.value}
                onAdd={(brk) => field.pushValue(brk)}
                onRemove={(index) => field.removeValue(index)}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="reservationEnabled">
          {(field) => (
            <label
              htmlFor={field.name}
              className={cn(
                inputVariants({ variant: "outlined" }),
                "mt-2 flex cursor-pointer items-center justify-between gap-2"
              )}
            >
              <span className="text-sm">Habilitar reserva de cupos</span>
              <Switch
                id={field.name}
                checked={field.state.value}
                onCheckedChange={(checked) => field.handleChange(checked)}
              />
            </label>
          )}
        </form.Field>
      </div>
    </form>
  )
}

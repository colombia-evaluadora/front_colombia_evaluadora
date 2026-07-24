import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { CaretDownIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { TimePicker } from "@/components/ui/time-picker"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useAcademicPeriodsQuery } from "../../api/query/use-academic-periods-query"
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
import type { AcademicPeriodStatus } from "../../api/types/academic-period/academic-period"
import { FieldDatePopover } from "./field-date-popover"
import { FieldTimePopover } from "./field-time-popover"

interface AcademicPeriodFormProps {
  id: string
  defaultValues?: Partial<AcademicPeriodFormInput>
  onSubmit: (values: AcademicPeriodFormValues) => void
}

type Break = { startTime: string; endTime: string }

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
      onSubmit: academicPeriodFormSchema,
    },
    onSubmit: ({ value }) => {
      onSubmit(academicPeriodFormSchema.parse(value))
    },
  })

  // Periodos existentes para el select "Periodo académico anterior".
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
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  Inicio del período académico*
                </FieldLabel>
                <FieldDatePopover
                  id={field.name}
                  value={field.state.value}
                  onChange={field.handleChange}
                  invalid={isInvalid}
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
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  Fin del período académico*
                </FieldLabel>
                <FieldDatePopover
                  id={field.name}
                  value={field.state.value}
                  onChange={field.handleChange}
                  invalid={isInvalid}
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
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  Fecha límite de matrícula*
                </FieldLabel>
                <FieldDatePopover
                  id={field.name}
                  value={field.state.value}
                  onChange={field.handleChange}
                  invalid={isInvalid}
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
              <Field data-invalid={isInvalid}>
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
                        ""
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

        <form.Field name="previousPeriodId">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>
                Periodo académico anterior
              </FieldLabel>
              <Select
                value={field.state.value ? String(field.state.value) : ""}
                onValueChange={(value) =>
                  field.handleChange(value ? Number(value) : null)
                }
              >
                <SelectTrigger id={field.name}>
                  <SelectValue placeholder="Seleccione un período">
                    {(value) => {
                      const p = previousPeriodOptions.find(
                        (o) => String(o.id) === value
                      )
                      return p ? `${p.name} — ${p.sedeName}` : ""
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {previousPeriodOptions.map((period) => (
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

        <form.Field name="status">
          {(field) => (
            <Field>
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
                        : ""
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
              <Field data-invalid={isInvalid}>
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
                          ?.name ?? ""
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
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Hora inicio</FieldLabel>
              <FieldTimePopover
                id={field.name}
                value={field.state.value}
                onChange={field.handleChange}
                placeholder="Seleccione una hora"
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="scheduleEndTime">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Hora final</FieldLabel>
              <FieldTimePopover
                id={field.name}
                value={field.state.value}
                onChange={field.handleChange}
                placeholder="Seleccione una hora"
              />
            </Field>
          )}
        </form.Field>

        {/* Fila 4: bloques, descansos, reserva */}
        <form.Field name="defaultBlocksCount">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>
                Número de bloques de la jornada
              </FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="number"
                min={0}
                placeholder="Ingrese la cantidad"
                value={field.state.value ?? ""}
                onBlur={field.handleBlur}
                onChange={(e) =>
                  field.handleChange(
                    Number.isNaN(e.target.valueAsNumber)
                      ? null
                      : e.target.valueAsNumber
                  )
                }
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="breaks" mode="array">
          {(field) => (
            <Field>
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
            <Field orientation="horizontal" className="items-center justify-between">
              <FieldLabel htmlFor={field.name}>
                Habilitar reserva de cupos
              </FieldLabel>
              <Switch
                id={field.name}
                checked={field.state.value}
                onCheckedChange={(checked) => field.handleChange(checked)}
              />
            </Field>
          )}
        </form.Field>
      </div>
    </form>
  )
}

// Formatea "HH:mm" (24h) a "h:mmam/pm" (ej. "05:00" → "5:00am").
function formatTime12(value: string): string {
  if (!value) return ""
  const [h, m] = value.split(":").map(Number)
  const period = h < 12 ? "am" : "pm"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, "0")}${period}`
}

function BreaksField({
  value,
  onAdd,
  onRemove,
}: {
  value: Break[]
  onAdd: (brk: Break) => void
  onRemove: (index: number) => void
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex h-10 w-full items-center justify-between gap-1.5 border border-transparent border-b-input bg-transparent px-0 py-2 text-left text-sm outline-none transition-[color,border-color] hover:border-b-ring/50 focus-visible:border-b-ring data-[popup-open]:border-b-ring",
              value.length === 0 && "text-muted-foreground"
            )}
          />
        }
      >
        <span className="truncate">
          {value.length > 0 ? `${value.length} descanso(s)` : "Agregar"}
        </span>
        <CaretDownIcon className="text-muted-foreground size-4 shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-72">
        <div className="flex flex-col gap-3">
          <BreakEditor onAdd={onAdd} />

          {value.length > 0 && (
            <ul className="flex flex-col">
              {value.map((brk, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between gap-4 border-t py-2 text-sm first:border-t-0"
                >
                  <span>
                    {formatTime12(brk.startTime)} → {formatTime12(brk.endTime)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Quitar descanso ${index + 1}`}
                    onClick={() => onRemove(index)}
                  >
                    <TrashIcon />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function BreakEditor({ onAdd }: { onAdd: (brk: Break) => void }) {
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")

  return (
    <div className="flex items-center gap-2">
      <div className="border-input flex items-center gap-2 border px-3 py-1.5">
        <BreakTimeTrigger
          value={startTime}
          onChange={setStartTime}
          placeholder="Hora inicio"
        />
        <span className="text-muted-foreground shrink-0">→</span>
        <BreakTimeTrigger
          value={endTime}
          onChange={setEndTime}
          placeholder="Hora Final"
        />
      </div>
      <Button
        type="button"
        color="primary"
        size="icon"
        aria-label="Agregar descanso"
        disabled={!startTime || !endTime}
        onClick={() => {
          onAdd({ startTime, endTime })
          setStartTime("")
          setEndTime("")
        }}
      >
        <PlusIcon weight="bold" />
      </Button>
    </div>
  )
}

function BreakTimeTrigger({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "w-20 text-left text-sm outline-none",
              value ? "text-foreground font-medium" : "text-muted-foreground"
            )}
          />
        }
      >
        {value ? formatTime12(value) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <TimePicker value={value || undefined} onChange={onChange} />
      </PopoverContent>
    </Popover>
  )
}

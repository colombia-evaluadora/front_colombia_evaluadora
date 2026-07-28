import { useForm } from "@tanstack/react-form"

import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  academicPeriodsFiltersFormSchema,
  type AcademicPeriodsFiltersFormInput,
  type AcademicPeriodsFiltersFormValues,
} from "../../../api/schema"
import { ACADEMIC_PERIOD_STATUS_LABELS } from "../../../api/ui-mappings"
import type { AcademicPeriodStatus } from "../../../api/types/academic-period/academic-period"
import { DatePicker } from "@/components/date-picker"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

// Sentinela para la opción "Todos" (Base UI Select no admite value vacío).
const ALL = "__all__"

const YEAR_OPTIONS = Array.from(
  { length: new Date().getFullYear() - 2020 + 1 },
  (_, i) => new Date().getFullYear() - i
)

const STATUS_OPTIONS = Object.keys(
  ACADEMIC_PERIOD_STATUS_LABELS
) as AcademicPeriodStatus[]

interface FilterAcademicPeriodsFormProps {
  id: string
  defaultValues: AcademicPeriodsFiltersFormInput
  onSubmit: (values: AcademicPeriodsFiltersFormValues) => void
}

export function FilterAcademicPeriodsForm({
  id,
  defaultValues,
  onSubmit,
}: FilterAcademicPeriodsFormProps) {
  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: academicPeriodsFiltersFormSchema,
    },
    onSubmit: ({ value }) => {
      onSubmit(academicPeriodsFiltersFormSchema.parse(value))
    },
  })

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
    >
      <form.Field name="sedeName">
        {(field) => (
          <Field orientation="vertical" className="gap-2">
            <FieldLabel htmlFor={field.name}>Sede</FieldLabel>
            <Input
              id={field.name}
              name={field.name}
              type="text"
              autoComplete="off"
              placeholder="ej. I.E. San José"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </Field>
        )}
      </form.Field>

      <Separator />

      <form.Field name="schoolYearId">
        {(field) => (
          <Field orientation="vertical" className="gap-2">
            <FieldLabel htmlFor={field.name}>Año lectivo</FieldLabel>
            <Select
              value={field.state.value || ALL}
              onValueChange={(value) =>
                field.handleChange(value === ALL ? "" : (value ?? ""))
              }
            >
              <SelectTrigger id={field.name}>
                <SelectValue>
                  {(value) => (value && value !== ALL ? String(value) : "Todos")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {YEAR_OPTIONS.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        )}
      </form.Field>

      <Separator />

      <form.Field name="status">
        {(field) => (
          <Field orientation="vertical" className="gap-2">
            <FieldLabel htmlFor={field.name}>Estado</FieldLabel>
            <Select
              value={field.state.value || ALL}
              onValueChange={(value) =>
                field.handleChange(value === ALL ? "" : (value ?? ""))
              }
            >
              <SelectTrigger id={field.name}>
                <SelectValue>
                  {(value) =>
                    value && value !== ALL
                      ? ACADEMIC_PERIOD_STATUS_LABELS[
                          value as AcademicPeriodStatus
                        ]
                      : "Todos"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={ALL}>Todos</SelectItem>
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

      <Separator />

      <form.Field name="startFrom">
        {(field) => (
          <Field orientation="vertical" className="gap-2">
            <FieldLabel htmlFor={field.name}>Inicio desde</FieldLabel>
            <DatePicker
              mode="date"
              id={field.name}
              value={parseDateValue(field.state.value)}
              onChange={(date) => field.handleChange(formatDateValue(date))}
            />
          </Field>
        )}
      </form.Field>

      <form.Field name="startTo">
        {(field) => (
          <Field orientation="vertical" className="gap-2">
            <FieldLabel htmlFor={field.name}>Inicio hasta</FieldLabel>
            <DatePicker
              mode="date"
              id={field.name}
              value={parseDateValue(field.state.value)}
              onChange={(date) => field.handleChange(formatDateValue(date))}
            />
          </Field>
        )}
      </form.Field>
    </form>
  )
}

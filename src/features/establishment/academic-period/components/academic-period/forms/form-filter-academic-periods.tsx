import { useMemo } from "react"
import { useForm } from "@tanstack/react-form"

import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
import { useAcademicPeriodStatusesQuery } from "../../../api/query/academic-period/use-academic-period-statuses-query"
import { DatePicker } from "@/components/date-picker"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

const ALL_VALUE = ""

const YEAR_OPTIONS = Array.from(
  { length: new Date().getFullYear() - 2020 + 1 },
  (_, i) => new Date().getFullYear() - i,
)

const yearItems: Record<string, React.ReactNode> = {
  [ALL_VALUE]: "Todos",
  ...Object.fromEntries(YEAR_OPTIONS.map((year) => [String(year), year])),
}

interface FilterAcademicPeriodsFormProps {
  id: string
  defaultValues: AcademicPeriodsFiltersFormInput
  onSubmit: (values: AcademicPeriodsFiltersFormValues) => void
  hideSede?: boolean
}

export function FilterAcademicPeriodsForm({
  id,
  defaultValues,
  onSubmit,
  hideSede = false,
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

  const { data: statusOptions = [] } = useAcademicPeriodStatusesQuery()

  const statusItems = useMemo<Record<string, React.ReactNode>>(
    () => ({
      [ALL_VALUE]: "Todos",
      ...Object.fromEntries(statusOptions.map((o) => [o.key, o.label])),
    }),
    [statusOptions],
  )

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="flex flex-1 flex-col gap-5 px-4"
    >
      {/* Sede, año y estado se explican solos: van en rejilla, sin una leyenda
          que les invente una categoría. */}
      <div className="grid grid-cols-2 gap-3">
        {!hideSede && (
          <form.Field name="sedeName">
            {(field) => (
              <Field orientation="vertical" variant="outlined" className="gap-2">
                <FieldLabel htmlFor={field.name}>Sede</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="text"
                  autoComplete="off"
                  placeholder="Agregar"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  className="h-9"
                />
              </Field>
            )}
          </form.Field>
        )}

        <form.Field name="schoolYearId">
          {(field) => (
            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor={field.name}>Año lectivo</FieldLabel>
              <Select
                items={yearItems}
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value ?? "")}
              >
                <SelectTrigger id={field.name} size="sm" className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={ALL_VALUE}>Todos</SelectItem>
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

        <form.Field name="status">
          {(field) => (
            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor={field.name}>Estado</FieldLabel>
              <Select
                items={statusItems}
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value ?? "")}
              >
                <SelectTrigger id={field.name} size="sm" className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={ALL_VALUE}>Todos</SelectItem>
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
      </div>

      {/* Acá la leyenda sí aporta: "Inicio desde" y "Inicio hasta" se leen como
          un intervalo, no como dos filtros sueltos. */}
      <FieldSet>
        <FieldLegend variant="label">Rango de inicio</FieldLegend>
        <div className="grid grid-cols-2 gap-3">
          <form.Field name="startFrom">
            {(field) => (
              <Field orientation="vertical" variant="outlined" className="gap-2">
                <FieldLabel htmlFor={field.name}>Inicio desde</FieldLabel>
                <DatePicker
                  mode="date"
                  id={field.name}
                  value={parseDateValue(field.state.value)}
                  onChange={(date) => field.handleChange(formatDateValue(date))}
                  className="h-9"
                />
              </Field>
            )}
          </form.Field>

          <form.Field name="startTo">
            {(field) => (
              <Field orientation="vertical" variant="outlined" className="gap-2">
                <FieldLabel htmlFor={field.name}>Inicio hasta</FieldLabel>
                <DatePicker
                  mode="date"
                  id={field.name}
                  value={parseDateValue(field.state.value)}
                  onChange={(date) => field.handleChange(formatDateValue(date))}
                  className="h-9"
                />
              </Field>
            )}
          </form.Field>
        </div>
      </FieldSet>
    </form>
  )
}

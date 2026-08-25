import { useMemo } from "react"
import { useForm } from "@tanstack/react-form"

import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"

import {
  academicPeriodsFiltersFormSchema,
  type AcademicPeriodsFiltersFormInput,
  type AcademicPeriodsFiltersFormValues,
} from "@/features/establishment/academic-period/api/schema"
import { useAcademicPeriodStatusesQuery } from "@/features/establishment/academic-period/api/query/use-academic-period-statuses"
import { useSchoolYearsQuery } from "@/features/establishment/academic-period/api/query/use-school-years"
import { DatePicker } from "@/components/date-picker"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

const ALL_VALUE = ""

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
    onSubmit: ({ value }) => onSubmit(value),
  })

  const { data: statusOptions = [] } = useAcademicPeriodStatusesQuery()
  const { data: schoolYearOptions = [] } = useSchoolYearsQuery()

  const statusItems = useMemo<Record<string, string>>(
    () => Object.fromEntries(statusOptions.map((o) => [String(o.id), o.label])),
    [statusOptions],
  )

  const yearItems = useMemo<Record<string, string>>(
    () =>
      Object.fromEntries(schoolYearOptions.map((year) => [year.name, year.name])),
    [schoolYearOptions],
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
                  size="sm"
                  autoComplete="off"
                  placeholder="Agregar"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </Field>
            )}
          </form.Field>
        )}

        <form.Field name="schoolYearId">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field
                orientation="vertical"
                variant="outlined"
                className="gap-2"
                data-invalid={isInvalid ? "true" : undefined}
              >
                <FieldLabel htmlFor={field.name}>Año lectivo</FieldLabel>
                <ComboboxField
                  items={yearItems}
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value ?? "")}
                >
                  <ComboboxFieldTrigger
                    id={field.name}
                    size="sm"
                    className="w-full"
                    aria-invalid={isInvalid}
                  >
                    <ComboboxFieldValue placeholder="Todos" />
                  </ComboboxFieldTrigger>
                  <ComboboxFieldContent>
                    <ComboboxGroup>
                      <ComboboxFieldItem value={ALL_VALUE}>Todos</ComboboxFieldItem>
                      {schoolYearOptions.map((year) => (
                        <ComboboxFieldItem key={year.id} value={year.name}>
                          {year.name}
                        </ComboboxFieldItem>
                      ))}
                    </ComboboxGroup>
                  </ComboboxFieldContent>
                </ComboboxField>
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="statusId">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field
                orientation="vertical"
                variant="outlined"
                className="gap-2"
                data-invalid={isInvalid ? "true" : undefined}
              >
                <FieldLabel htmlFor={field.name}>Estado</FieldLabel>
                <ComboboxField
                  items={statusItems}
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value ?? "")}
                >
                  <ComboboxFieldTrigger
                    id={field.name}
                    size="sm"
                    className="w-full"
                    aria-invalid={isInvalid}
                  >
                    <ComboboxFieldValue placeholder="Todos" />
                  </ComboboxFieldTrigger>
                  <ComboboxFieldContent>
                    <ComboboxGroup>
                      <ComboboxFieldItem value={ALL_VALUE}>Todos</ComboboxFieldItem>
                      {statusOptions.map((option) => (
                        <ComboboxFieldItem key={option.id} value={String(option.id)}>
                          {option.label}
                        </ComboboxFieldItem>
                      ))}
                    </ComboboxGroup>
                  </ComboboxFieldContent>
                </ComboboxField>
              </Field>
            )
          }}
        </form.Field>
      </div>
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
                  size="sm"
                  value={parseDateValue(field.state.value)}
                  onChange={(date) => field.handleChange(formatDateValue(date))}
                />
              </Field>
            )}
          </form.Field>

          <form.Field name="startTo">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field
                  orientation="vertical"
                  variant="outlined"
                  className="gap-2"
                  data-invalid={isInvalid ? "true" : undefined}
                >
                  <FieldLabel htmlFor={field.name}>Inicio hasta</FieldLabel>
                  <DatePicker
                    mode="date"
                    id={field.name}
                    size="sm"
                    aria-invalid={isInvalid}
                    value={parseDateValue(field.state.value)}
                    onChange={(date) => field.handleChange(formatDateValue(date))}
                  />
                </Field>
              )
            }}
          </form.Field>
        </div>
      </FieldSet>
    </form>
  )
}

import { useAppForm } from "@/lib/forms"

import { Field, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"

import {
  ENROLLMENT_MODALITIES,
  academicPeriodsFiltersFormSchema,
  type AcademicPeriodsFiltersFormInput,
  type AcademicPeriodsFiltersFormValues,
} from "@/features/establishment/academic-period/api/schema"
import {
  useAcademicPeriodStatusesQuery,
  useJornadasQuery,
} from "@/features/establishment/academic-period/api/query/catalogos-lista-valor"
import { useSedeOptionsQuery } from "@/features/establishment/academic-period/api/query/use-sede-options"
import { useSchoolYearsQuery } from "@/features/establishment/academic-period/api/query/use-school-years"

const ALL_VALUE = ""

interface SelectOption {
  value: string
  label: string
}

interface SelectFilterProps {
  id: string
  label: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
}

// Selector con opción "Todos" (valor vacío = sin filtro).
function SelectFilter({ id, label, options, value, onChange }: SelectFilterProps) {
  const items: Record<string, string> = Object.fromEntries(options.map((o) => [o.value, o.label]))
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <ComboboxField items={items} value={value} onValueChange={(next) => onChange(next ?? "")}>
        <ComboboxFieldTrigger id={id} size="sm" className="w-full">
          <ComboboxFieldValue placeholder="Todos" />
        </ComboboxFieldTrigger>
        <ComboboxFieldContent>
          <ComboboxGroup>
            <ComboboxFieldItem value={ALL_VALUE}>Todos</ComboboxFieldItem>
            {options.map((o) => (
              <ComboboxFieldItem key={o.value} value={o.value}>
                {o.label}
              </ComboboxFieldItem>
            ))}
          </ComboboxGroup>
        </ComboboxFieldContent>
      </ComboboxField>
    </Field>
  )
}

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
  const form = useAppForm({
    defaultValues,
    validators: {
      onSubmit: academicPeriodsFiltersFormSchema,
    },
    onSubmit: ({ value }) => onSubmit(value),
  })

  const { data: statusOptions = [] } = useAcademicPeriodStatusesQuery()
  const { data: schoolYearOptions = [] } = useSchoolYearsQuery()
  const { data: sedes = [] } = useSedeOptionsQuery()
  const { data: jornadas = [] } = useJornadasQuery()

  const sedeOptions = sedes.map((s) => ({ value: String(s.pk_sede), label: s.nombre }))
  const jornadaOptions = jornadas.map((j) => ({ value: String(j.id), label: j.name }))
  const modalityOptions = ENROLLMENT_MODALITIES.map((m) => ({ value: m.value, label: m.label }))

  const statusItems: Record<string, string> = Object.fromEntries(statusOptions.map((o) => [String(o.id), o.label]))

  const yearItems: Record<string, string> = Object.fromEntries(schoolYearOptions.map((year) => [year.name, year.name]))

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
        <form.Field name="sedeId">
          {(field) => (
            <SelectFilter
              id={field.name}
              label="Sede"
              options={sedeOptions}
              value={field.state.value}
              onChange={field.handleChange}
            />
          )}
        </form.Field>
        <form.Field name="jornadaId">
          {(field) => (
            <SelectFilter
              id={field.name}
              label="Jornada"
              options={jornadaOptions}
              value={field.state.value}
              onChange={field.handleChange}
            />
          )}
        </form.Field>

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
                <FieldLabel htmlFor={field.name}>Año</FieldLabel>
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

        <form.Field name="enrollmentModality">
          {(field) => (
            <SelectFilter
              id={field.name}
              label="Modalidad de matrícula"
              options={modalityOptions}
              value={field.state.value}
              onChange={field.handleChange}
            />
          )}
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
    </form>
  )
}

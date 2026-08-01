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
import { DatePicker } from "@/components/date-picker"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

// `items` mapea el `value` del `SelectItem` al label que renderiza
// `SelectValue` automáticamente (sin necesidad de función child). El key
// vacío representa la opción "Todos" — el `value` se persiste como "" en
// el form y se filtra en el backend.
const ALL_VALUE = ""

const YEAR_OPTIONS = Array.from(
  { length: new Date().getFullYear() - 2020 + 1 },
  (_, i) => new Date().getFullYear() - i
)

const yearItems: Record<string, React.ReactNode> = {
  [ALL_VALUE]: "Todos",
  ...Object.fromEntries(YEAR_OPTIONS.map((year) => [String(year), year])),
}

const statusItems: Record<string, React.ReactNode> = {
  [ALL_VALUE]: "Todos",
  ...ACADEMIC_PERIOD_STATUS_LABELS,
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
          <Field orientation="vertical" variant="outlined" className="gap-2">
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
              className="h-9"
            />
          </Field>
        )}
      </form.Field>

      <Separator />

      <form.Field name="schoolYearId">
        {(field) => (
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor={field.name}>Año lectivo</FieldLabel>
            <Select
              items={yearItems}
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value ?? "")}
            >
              <SelectTrigger id={field.name} size="sm">
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

      <Separator />

      <form.Field name="status">
        {(field) => (
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor={field.name}>Estado</FieldLabel>
            <Select
              items={statusItems}
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value ?? "")}
            >
              <SelectTrigger id={field.name} size="sm">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={ALL_VALUE}>Todos</SelectItem>
                  {Object.entries(ACADEMIC_PERIOD_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
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
    </form>
  )
}

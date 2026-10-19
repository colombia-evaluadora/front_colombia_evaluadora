import type { ReactNode } from "react"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/date-picker"
import { ComboboxField, ComboboxFieldContent, ComboboxFieldItem, ComboboxFieldTrigger, ComboboxFieldValue } from "@/components/ui/combobox"
import { Card, CardContent } from "@/components/ui/card"
import { FormSectionHeading } from "@/components/form-section-heading"
import { isFieldRequired, isFieldVisible, type MatriculaFieldSettingsMap } from "@/features/coverage/matricula/utils/matricula-field-settings"
import { formatDateValue, parseDateValue } from "@/lib/date-time-value"
import type { MatriculaDeptMunicipio } from "@/features/coverage/matricula/api/types/matricula"

interface SectionProps {
  title: string
  /** Archivos va a 2 por fila; el resto de las secciones, a 3. */
  columns?: 2 | 3
  children: ReactNode
}

// Mismo look que las secciones del alta de establecimiento (`Card` con
// borde), pero sin el `Accordion` que las envuelve ahí: acá van todas
// abiertas y visibles a la vez, una debajo de la otra.
export function MatriculaFormSection({ title, columns = 3, children }: SectionProps) {
  return (
    <Card className="rounded-md border border-border py-5">
      <CardContent className="grid gap-3">
        <FormSectionHeading>{title}</FormSectionHeading>
        <div
          className={
            columns === 2
              ? "grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2"
              : "grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3"
          }
        >
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

interface TextFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: "text" | "date" | "email" | "tel"
  required?: boolean
  invalid?: boolean
  numeric?: boolean
  maxLength?: number
  disabled?: boolean
}

export function MatriculaTextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  required,
  invalid,
  numeric,
  maxLength,
  disabled,
}: TextFieldProps) {
  return (
    <Field
      orientation="vertical"
      variant="outlined"
      className="w-full gap-2"
      data-invalid={invalid ? "true" : undefined}
    >
      <FieldLabel htmlFor={id}>
        {label}
        {required ? "*" : ""}
      </FieldLabel>
      <Input
        id={id}
        name={id}
        type={type}
        size="sm"
        autoComplete="off"
        placeholder="Agregar"
        value={value}
        aria-invalid={invalid}
        inputMode={numeric ? "numeric" : undefined}
        maxLength={maxLength}
        disabled={disabled}
        onChange={(event) => {
          const raw = event.target.value
          onChange(numeric ? raw.replace(/\D/g, "") : raw)
        }}
      />
    </Field>
  )
}

interface DateFieldProps {
  id: string
  label: string
  /** `yyyy-MM-dd`, igual que el resto del formulario (mismo shape que un
   * `<input type="date">` nativo). */
  value: string
  onChange: (value: string) => void
  required?: boolean
  invalid?: boolean
  maxDate?: Date
}

/** Mismo `DatePicker` que usa Establecimiento, con el label flotante del resto de campos del alta. */
export function MatriculaDateField({
  id,
  label,
  value,
  onChange,
  required,
  invalid,
  maxDate,
}: DateFieldProps) {
  return (
    <Field
      orientation="vertical"
      variant="outlined"
      className="w-full gap-2"
      data-invalid={invalid ? "true" : undefined}
    >
      <FieldLabel htmlFor={id}>
        {label}
        {required ? "*" : ""}
      </FieldLabel>
      <DatePicker
        id={id}
        mode="date"
        value={parseDateValue(value)}
        aria-invalid={invalid}
        maxDate={maxDate}
        onChange={(date) => onChange(formatDateValue(date) ?? "")}
      />
    </Field>
  )
}

interface SelectFieldProps {
  id: string
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
  labelFor?: (option: string) => string
  invalid?: boolean
  disabled?: boolean
}

export function MatriculaSelectField({
  id,
  label,
  value,
  options,
  onChange,
  required,
  placeholder = "Seleccionar",
  labelFor = (option) => option,
  invalid,
  disabled,
}: SelectFieldProps) {
  const items = Object.fromEntries([
    ["", placeholder],
    ...options.map((option) => [option, labelFor(option)]),
  ])
  return (
    <Field
      orientation="vertical"
      variant="outlined"
      className="w-full gap-2"
      data-invalid={invalid ? "true" : undefined}
    >
      <FieldLabel htmlFor={id}>
        {label}
        {required ? "*" : ""}
      </FieldLabel>
      <ComboboxField
        items={items}
        value={value}
        onValueChange={(next) => onChange(next ?? "")}
        disabled={disabled}
      >
        <ComboboxFieldTrigger id={id} size="sm" className="w-full" aria-invalid={invalid}>
          <ComboboxFieldValue placeholder={placeholder} />
        </ComboboxFieldTrigger>
        <ComboboxFieldContent>
          {/* Opción para deseleccionar: vuelve el campo a su placeholder. */}
          <ComboboxFieldItem key="__empty__" value="">
            {placeholder}
          </ComboboxFieldItem>
          {options.map((option) => (
            <ComboboxFieldItem key={option} value={option}>
              {labelFor(option)}
            </ComboboxFieldItem>
          ))}
        </ComboboxFieldContent>
      </ComboboxField>
    </Field>
  )
}

// ── Departamento / municipio ─────────────────────────────────────────────────
// Se repite seis veces en el formulario (expedición y nacimiento del
// estudiante, residencia de estudiante y acudiente, expedición del
// acudiente): un solo componente evita reescribir el filtrado en cascada
// cada vez.

export interface MunicipalityOption {
  id: number
  name: string
}

export interface DepartmentOption {
  name: string
  municipalities: MunicipalityOption[]
}

interface DeptMunicipioFieldsProps {
  idPrefix: string
  departmentLabel: string
  municipalityLabel: string
  value: MatriculaDeptMunicipio
  departments: DepartmentOption[]
  onChange: (value: MatriculaDeptMunicipio) => void
  fieldSettings?: MatriculaFieldSettingsMap
}

export function DeptMunicipioFields({
  idPrefix,
  departmentLabel,
  municipalityLabel,
  value,
  departments,
  onChange,
  fieldSettings,
}: DeptMunicipioFieldsProps) {
  const municipalities = departments.find((d) => d.name === value.department)?.municipalities ?? []
  const municipalityNameById = new Map(municipalities.map((m) => [String(m.id), m.name]))
  const departmentId = `${idPrefix}-department`
  const municipalityId = `${idPrefix}-municipality`

  return (
    <>
      {isFieldVisible(fieldSettings, departmentId) && (
        <MatriculaSelectField
          id={departmentId}
          label={departmentLabel}
          required={isFieldRequired(fieldSettings, departmentId)}
          value={value.department}
          options={departments.map((d) => d.name)}
          onChange={(department) => onChange({ department, municipality: "" })}
        />
      )}
      {isFieldVisible(fieldSettings, municipalityId) && (
        <MatriculaSelectField
          id={municipalityId}
          label={municipalityLabel}
          required={isFieldRequired(fieldSettings, municipalityId)}
          value={value.municipality}
          options={municipalities.map((m) => String(m.id))}
          labelFor={(option) => municipalityNameById.get(option) ?? option}
          placeholder={!value.department ? "Elegí departamento primero" : "Seleccionar"}
          disabled={!value.department}
          onChange={(municipality) => onChange({ ...value, municipality })}
        />
      )}
    </>
  )
}

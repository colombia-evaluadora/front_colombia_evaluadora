import { DatePicker } from "@/components/date-picker"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

interface Props {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  /** Límites `yyyy-MM-dd`: los días fuera quedan deshabilitados en el calendario. */
  min?: string | null
  max?: string | null
  required?: boolean
  disabled?: boolean
  error?: string
}

/** Fecha con DatePicker en Field outlined; `value`, `min` y `max` viajan como `yyyy-MM-dd`. */
export function CampoFecha({ id, label, value, onChange, min, max, required = true, disabled, error }: Props) {
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && "*"}
      </FieldLabel>
      <DatePicker
        id={id}
        disabled={disabled}
        minDate={min ? parseDateValue(min) : undefined}
        maxDate={max ? parseDateValue(max) : undefined}
        value={parseDateValue(value)}
        onChange={(date) => onChange(formatDateValue(date))}
      />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

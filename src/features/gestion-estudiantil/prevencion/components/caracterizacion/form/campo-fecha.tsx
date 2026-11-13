import { DatePicker } from "@/components/date-picker"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"

interface Props {
  id: string
  label: string
  value: Date | undefined
  onChange: (value: Date | undefined) => void
  required?: boolean
  error?: string
  disabled?: boolean
  /** Sin fechas futuras (fecha de conocimiento, referencia de un conteo). */
  hastaHoy?: boolean
  className?: string
}

/** Fecha dd/mm/aaaa con error en línea. */
export function CampoFecha({ id, label, value, onChange, required, error, disabled, hastaHoy = true, className }: Props) {
  return (
    <Field orientation="vertical" variant="outlined" className={className ?? "gap-2"} data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && "*"}
      </FieldLabel>
      <DatePicker
        id={id}
        value={value}
        maxDate={hastaHoy ? new Date() : undefined}
        disabled={disabled}
        aria-invalid={Boolean(error) || undefined}
        onChange={onChange}
      />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

import { CharacterCounter } from "@/components/ui/character-counter"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"

interface TextoLargoProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  max: number
  required?: boolean
  rows?: number
  placeholder?: string
  error?: string
  disabled?: boolean
}

/** Texto largo con contador (patrón del Observador): `maxLength` corta y el error va a la izquierda del contador. */
export function TextoLargo({ id, label, value, onChange, max, required, rows = 3, placeholder, error, disabled }: TextoLargoProps) {
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && "*"}
      </FieldLabel>
      <Textarea
        id={id}
        rows={rows}
        className={TEXTAREA_OUTLINED}
        maxLength={max}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        aria-invalid={Boolean(error) || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="flex justify-between">
        {error ? <FieldError>{error}</FieldError> : <span />}
        <CharacterCounter value={value} max={max} />
      </div>
    </Field>
  )
}


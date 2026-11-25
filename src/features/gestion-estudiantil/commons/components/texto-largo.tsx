import { Field, FieldError, FieldLabel, FieldDescription } from "@/components/ui/field"
import { CharacterCounter } from "@/components/ui/character-counter"
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
  /** Ayuda corta del campo: va en la línea del contador, a la izquierda; el error la reemplaza. */
  descripcion?: string
}

/**
 * Texto largo con contador (patrón del Observador): `maxLength` corta y el error (o, sin error, la ayuda)
 * va a la izquierda del contador, en la misma línea.
 */
export function TextoLargo({ id, label, value, onChange, max, required, rows = 3, placeholder, error, disabled, descripcion }: TextoLargoProps) {
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && <span data-required-mark="">*</span>}
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
      <div className="flex justify-between gap-3">
        {error ? <FieldError>{error}</FieldError> : descripcion ? <FieldDescription>{descripcion}</FieldDescription> : <span />}
        <CharacterCounter value={value} max={max} />
      </div>
    </Field>
  )
}


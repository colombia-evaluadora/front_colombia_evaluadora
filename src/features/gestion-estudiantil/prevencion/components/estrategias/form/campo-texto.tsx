import { CharacterCounter } from "@/components/ui/character-counter"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

interface Props {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  /** Con `max`, el campo corta y muestra el contador «22 / 120». */
  max?: number
  inputMode?: "numeric" | "text"
  error?: string
  className?: string
  disabled?: boolean
  /** Ayuda bajo el campo (reglas de la especificación). */
  ayuda?: string
}

/** Campo de texto de una línea de los formularios de Estrategias: etiqueta, contador opcional y error en línea. */
export function CampoTexto({ id, label, value, onChange, required, max, inputMode, error, className, disabled, ayuda }: Props) {
  return (
    <Field
      orientation="vertical"
      variant="outlined"
      className={className ?? "gap-2"}
      data-invalid={Boolean(error) || undefined}
    >
      <FieldLabel htmlFor={id}>
        {label}
        {required && "*"}
      </FieldLabel>
      <Input
        id={id}
        value={value}
        maxLength={max}
        inputMode={inputMode}
        disabled={disabled}
        aria-invalid={Boolean(error) || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {ayuda && !error && <FieldDescription>{ayuda}</FieldDescription>}
      {(error || max != null) && (
        <div className="flex justify-between">
          {error ? <FieldError>{error}</FieldError> : <span />}
          {max != null && <CharacterCounter value={value} max={max} />}
        </div>
      )}
    </Field>
  )
}

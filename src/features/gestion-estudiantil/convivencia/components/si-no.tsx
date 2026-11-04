import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface SiNoProps {
  id: string
  label: string
  /** `null` = sin responder: los indicadores Sí/No no se presumen (3.1). */
  value: boolean | null
  onChange: (value: boolean) => void
  disabled?: boolean
  required?: boolean
  error?: string
}

/** Pregunta Sí/No con dos radios y sin valor por defecto (patrón de dialog-save-festivo). */
export function SiNo({ id, label, value, onChange, disabled, required, error }: SiNoProps) {
  return (
    <Field
      orientation="vertical"
      variant="outlined"
      className="gap-2"
      role="group"
      aria-labelledby={`${id}-label`}
      data-invalid={Boolean(error) || undefined}
      data-disabled={disabled || undefined}
    >
      <FieldLabel id={`${id}-label`}>
        {label}
        {required && "*"}
      </FieldLabel>
      <RadioGroup
        aria-labelledby={`${id}-label`}
        // pl-3.5: el mismo sangrado que el texto de la etiqueta flotante, para que el círculo arranque bajo ella.
        className="flex h-11 flex-row items-center gap-6 pr-3 pl-3.5"
        value={value == null ? "" : value ? "si" : "no"}
        onValueChange={(v) => onChange(v === "si")}
        disabled={disabled}
      >
        <label className="flex items-center gap-2 text-sm">
          <RadioGroupItem value="si" />
          Sí
        </label>
        <label className="flex items-center gap-2 text-sm">
          <RadioGroupItem value="no" />
          No
        </label>
      </RadioGroup>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

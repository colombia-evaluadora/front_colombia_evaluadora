import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"

interface Props {
  id: string
  label: string
  value: string
  options: Opcion[]
  onChange: (value: string) => void
  required?: boolean
  error?: string
}

/** Opción única (radios) en Field outlined, p. ej. Resultado Sancionar/Archivar. */
export function CampoOpcionUnica({ id, label, value, options, onChange, required = true, error }: Props) {
  return (
    <Field
      orientation="vertical"
      variant="outlined"
      className="gap-2"
      role="group"
      aria-labelledby={`${id}-label`}
      data-invalid={Boolean(error) || undefined}
    >
      <FieldLabel id={`${id}-label`}>
        {label}
        {required && "*"}
      </FieldLabel>
      <RadioGroup
        aria-labelledby={`${id}-label`}
        className="flex h-11 flex-row items-center gap-6 pr-3 pl-3.5"
        value={value}
        onValueChange={onChange}
      >
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm whitespace-nowrap">
            <RadioGroupItem value={o.value} />
            {o.label}
          </label>
        ))}
      </RadioGroup>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

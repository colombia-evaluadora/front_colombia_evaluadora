import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface Props {
  id: string
  label: string
  value: boolean | null
  onChange: (value: boolean | null) => void
  required?: boolean
  error?: string
  disabled?: boolean
  ayuda?: string
}

/** Sí / No sin valor predeterminado: tocar de nuevo la opción elegida la deja sin responder. */
export function CampoSiNo({ id, label, value, onChange, required, error, disabled, ayuda }: Props) {
  return (
    <Field orientation="vertical" variant="plain" className="gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && "*"}
      </FieldLabel>
      <ToggleGroup
        id={id}
        value={value == null ? [] : [value ? "si" : "no"]}
        onValueChange={(v) => onChange(v[0] === "si" ? true : v[0] === "no" ? false : null)}
        multiple={false}
        spacing={0}
        variant="outline"
        disabled={disabled}
        aria-invalid={Boolean(error) || undefined}
      >
        <ToggleGroupItem value="si" size="sm" aria-label={`${label}: Sí`} className="px-6">
          Sí
        </ToggleGroupItem>
        <ToggleGroupItem value="no" size="sm" aria-label={`${label}: No`} className="px-6">
          No
        </ToggleGroupItem>
      </ToggleGroup>
      {ayuda && !error && <FieldDescription>{ayuda}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

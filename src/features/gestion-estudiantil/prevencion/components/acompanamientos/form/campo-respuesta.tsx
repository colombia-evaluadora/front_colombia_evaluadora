import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import type { OpcionCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"

interface Props {
  id: string
  label: string
  opciones: OpcionCatalogo[]
  value: string
  onChange: (value: string) => void
  error?: string
}

/**
 * Pregunta de respuesta explícita (Sí / No / Sin información, lista RESPUESTA_ACOMPANAMIENTO): sin valor
 * predeterminado, porque la especificación pide no presumir la respuesta.
 */
export function CampoRespuesta({ id, label, opciones, value, onChange, error }: Props) {
  return (
    <Field
      orientation="vertical"
      variant="outlined"
      className="gap-2"
      role="group"
      aria-labelledby={`${id}-label`}
      data-invalid={Boolean(error) || undefined}
    >
      <FieldLabel id={`${id}-label`}>{label}*</FieldLabel>
      <RadioGroup
        id={id}
        aria-labelledby={`${id}-label`}
        aria-invalid={Boolean(error) || undefined}
        className="flex min-h-10 flex-row flex-wrap items-center gap-x-6 gap-y-2 pr-3 pl-3.5"
        value={value}
        onValueChange={(v) => onChange(String(v))}
      >
        {opciones.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm">
            <RadioGroupItem value={o.value} />
            {o.label}
          </label>
        ))}
      </RadioGroup>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

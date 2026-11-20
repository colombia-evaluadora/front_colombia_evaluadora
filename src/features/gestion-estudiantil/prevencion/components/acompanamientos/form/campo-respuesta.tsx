import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import type { OpcionCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { MarcoOpciones } from "@/features/gestion-estudiantil/commons/components/marco-opciones"

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
 * predeterminado, porque la especificación pide no presumir la respuesta. Va en el recuadro de opciones.
 */
export function CampoRespuesta({ id, label, opciones, value, onChange, error }: Props) {
  return (
    <MarcoOpciones id={id} label={label} required error={error}>
      <RadioGroup
        id={id}
        aria-labelledby={`${id}-label`}
        aria-invalid={Boolean(error) || undefined}
        value={value}
        onValueChange={(v) => onChange(String(v))}
      >
        {opciones.map((o) => (
          <label key={o.value} className="flex items-center gap-2">
            <RadioGroupItem value={o.value} />
            {o.label}
          </label>
        ))}
      </RadioGroup>
    </MarcoOpciones>
  )
}

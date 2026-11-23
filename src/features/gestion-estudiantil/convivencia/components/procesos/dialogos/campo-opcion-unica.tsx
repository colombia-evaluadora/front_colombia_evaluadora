import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { MarcoOpciones } from "@/components/marco-opciones"
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

/** Opción única (radios) en el recuadro de opciones, p. ej. Resultado Sancionar/Archivar. */
export function CampoOpcionUnica({ id, label, value, options, onChange, required = true, error }: Props) {
  return (
    <MarcoOpciones id={id} label={label} required={required} error={error}>
      <RadioGroup aria-labelledby={`${id}-label`} value={value} onValueChange={onChange}>
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 whitespace-nowrap">
            <RadioGroupItem value={o.value} />
            {o.label}
          </label>
        ))}
      </RadioGroup>
    </MarcoOpciones>
  )
}

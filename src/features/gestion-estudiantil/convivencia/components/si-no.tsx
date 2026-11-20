import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { MarcoOpciones } from "@/features/gestion-estudiantil/commons/components/marco-opciones"

interface SiNoProps {
  id: string
  label: string
  /** `null` = sin responder: los indicadores Sí/No no se presumen (3.1). */
  value: boolean | null
  onChange: (value: boolean) => void
  disabled?: boolean
  required?: boolean
  error?: string
  /** Deshabilita solo la opción «No» (p. ej. «No presentó» antes de vencer el plazo). */
  noDeshabilitado?: boolean
}

/** Pregunta Sí/No con dos radios en el recuadro de opciones, sin valor por defecto (patrón de dialog-save-festivo). */
export function SiNo({ id, label, value, onChange, disabled, required, error, noDeshabilitado }: SiNoProps) {
  return (
    <MarcoOpciones id={id} label={label} required={required} error={error}>
      <RadioGroup
        aria-labelledby={`${id}-label`}
        value={value == null ? "" : value ? "si" : "no"}
        onValueChange={(v) => onChange(v === "si")}
        disabled={disabled}
      >
        <label className="flex items-center gap-2">
          <RadioGroupItem value="si" />
          Sí
        </label>
        <label className="flex items-center gap-2">
          <RadioGroupItem value="no" disabled={noDeshabilitado} />
          No
        </label>
      </RadioGroup>
    </MarcoOpciones>
  )
}

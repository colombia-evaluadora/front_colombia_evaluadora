import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Input } from "@/components/ui/input"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"

import { MarcoOpciones } from "@/components/marco-opciones"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"

interface TextoProps {
  id: string
  label: string
  value: string
  max: number
  required?: boolean
  error?: string
  onChange: (value: string) => void
}

/** Nombre con contador (G.10.PRD.SAN.3: «43 / 100»). */
export function CampoNombre({ id, label, value, max, required = true, error, onChange }: TextoProps) {
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>
        {/* Texto y `*` en un solo hijo: el label flotante separa sus hijos con espacio. */}
        <span>
          {label}
          {required && <span data-required-mark="">*</span>}
        </span>
      </FieldLabel>
      <Input id={id} maxLength={max} value={value} aria-invalid={Boolean(error) || undefined} onChange={(e) => onChange(e.target.value)} />
      <div className="flex justify-between gap-2">
        {error ? <FieldError>{error}</FieldError> : <span />}
        <CharacterCounter value={value} max={max} />
      </div>
    </Field>
  )
}

/** Descripción opcional con contador de 500. */
export function CampoDescripcion({ id, label, value, max, error, onChange }: TextoProps) {
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        id={id}
        rows={3}
        className={TEXTAREA_OUTLINED}
        maxLength={max}
        value={value}
        aria-invalid={Boolean(error) || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="flex justify-between gap-2">
        {error ? <FieldError>{error}</FieldError> : <span />}
        <CharacterCounter value={value} max={max} />
      </div>
    </Field>
  )
}

interface RadiosProps {
  id: string
  label: string
  value: string
  options: Opcion[]
  required?: boolean
  error?: string
  onChange: (value: string) => void
}

/** Opción única en línea (Estado, Tiene duración, Efecto de la sanción). */
export function CampoRadios({ id, label, value, options, required = true, error, onChange }: RadiosProps) {
  return (
    <MarcoOpciones id={id} label={label} required={required} error={error}>
      <RadioGroup
        aria-labelledby={`${id}-label`}
        aria-invalid={Boolean(error) || undefined}
        value={value}
        onValueChange={(v) => onChange(String(v))}
      >
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2">
            <RadioGroupItem value={o.value} />
            {o.label}
          </label>
        ))}
      </RadioGroup>
    </MarcoOpciones>
  )
}

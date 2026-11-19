import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"

import type { OpcionCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"

interface Props {
  id: string
  label: string
  opciones: OpcionCatalogo[] | undefined
  value: string[]
  onChange: (value: string[]) => void
  required?: boolean
  error?: string
  disabled?: boolean
  ayuda?: string
  /** Ids marcados por otra respuesta (p. ej. Internet sale de la disponibilidad en el hogar): se ven marcados y no se tocan. */
  vinculadas?: string[]
}

/** Casillas de selección múltiple sobre una lista de la caracterización. */
export function CampoCasillas({ id, label, opciones, value, onChange, required, error, disabled, ayuda, vinculadas = [] }: Props) {
  const alternar = (opcion: string, marcada: boolean) =>
    onChange(marcada ? [...value, opcion] : value.filter((v) => v !== opcion))
  return (
    <Field orientation="vertical" variant="plain" className="gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel id={`${id}-etiqueta`}>
        {label}
        {required && "*"}
      </FieldLabel>
      <div
        id={id}
        role="group"
        aria-labelledby={`${id}-etiqueta`}
        aria-invalid={Boolean(error) || undefined}
        className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 xl:grid-cols-4"
      >
        {(opciones ?? []).map((o) => {
          const vinculada = vinculadas.includes(o.value)
          return (
            <label key={o.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={vinculada || value.includes(o.value)}
                disabled={disabled || vinculada}
                onCheckedChange={(marcada) => alternar(o.value, marcada)}
              />
              {o.label}
            </label>
          )
        })}
      </div>
      {ayuda && !error && <FieldDescription>{ayuda}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

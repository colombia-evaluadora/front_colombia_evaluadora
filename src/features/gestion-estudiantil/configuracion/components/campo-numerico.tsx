import type { ReactNode } from "react"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { TituloConAyuda } from "@/components/titulo-con-ayuda"

interface Props {
  id: string
  label: string
  value: string
  inputMode: "numeric" | "decimal"
  ayuda?: ReactNode
  /** Texto del ⓘ junto a la etiqueta (G.10.PLA.1). */
  ayudaTitulo?: string
  required?: boolean
  disabled?: boolean
  error?: string
  onChange: (value: string) => void
}

/**
 * Rejilla de los campos de Configuración: cada celda mide al menos 28rem para que la etiqueta flotante del
 * Field outlined (p. ej. «Plazo de seguimiento de remisiones (días hábiles)*») quepa en una sola línea.
 */
export const REJILLA_CAMPOS = "grid grid-cols-1 items-start gap-4 md:grid-cols-[repeat(auto-fill,minmax(28rem,1fr))]"

/** Campo numérico outlined de las pestañas de Configuración: el error reemplaza a la ayuda. */
export function CampoNumerico({ id, label, value, inputMode, ayuda, ayudaTitulo, required = true, disabled, error, onChange }: Props) {
  const etiqueta = (
    <span>
      {label}
      {required && <span data-required-mark="">*</span>}
    </span>
  )
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>
        {ayudaTitulo ? (
          <TituloConAyuda titulo={label} ayuda={ayudaTitulo}>
            {etiqueta}
          </TituloConAyuda>
        ) : (
          etiqueta
        )}
      </FieldLabel>
      <Input
        id={id}
        inputMode={inputMode}
        autoComplete="off"
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error) || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <FieldError>{error}</FieldError> : ayuda && <FieldDescription>{ayuda}</FieldDescription>}
    </Field>
  )
}

import { useMemo } from "react"

import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"

import type { OpcionGrupoObservacion } from "@/features/gestion-estudiantil/observaciones/api/types"

interface Props {
  id: string
  /** Grupos de la designación del usuario. */
  grupos: OpcionGrupoObservacion[]
  value: number[]
  error?: string
  onChange: (grupos: number[]) => void
}

/** Grado/Grupo* (multiselección): solo los grupos que el Responsable de grupo dirige (§8). */
export function CampoGrupos({ id, grupos, value, error, onChange }: Props) {
  const etiquetas = useMemo(() => new Map(grupos.map((g) => [g.fk_tgrupo, g.grado_grupo])), [grupos])
  const sinGrupos = grupos.length === 0

  return (
    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>Grado/Grupo*</FieldLabel>
      <ComboboxField<number, true> multiple disabled={sinGrupos} value={value} onValueChange={(v) => onChange(v ?? [])}>
        <ComboboxFieldTrigger id={id} className="w-full" aria-invalid={Boolean(error) || undefined}>
          <ComboboxFieldValue placeholder={sinGrupos ? "No dirige ningún grupo" : "Seleccionar"}>
            {(elegidos: number[]) =>
              elegidos.length === 0
                ? sinGrupos
                  ? "No dirige ningún grupo"
                  : "Seleccionar"
                : elegidos.map((g) => etiquetas.get(g) ?? `Grupo ${g}`).join(", ")
            }
          </ComboboxFieldValue>
        </ComboboxFieldTrigger>
        <ComboboxFieldContent>
          {grupos.map((g) => (
            <ComboboxFieldItem key={g.fk_tgrupo} value={g.fk_tgrupo} title={g.grado_grupo}>
              {g.grado_grupo}
            </ComboboxFieldItem>
          ))}
        </ComboboxFieldContent>
      </ComboboxField>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

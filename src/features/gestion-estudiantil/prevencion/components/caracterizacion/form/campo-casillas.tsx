import { Checkbox } from "@/components/ui/checkbox"

import type { OpcionCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { MarcoOpciones } from "@/features/gestion-estudiantil/commons/components/marco-opciones"

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
    <MarcoOpciones
      id={id}
      label={label}
      required={required}
      error={error}
      descripcion={ayuda}
      contentClassName="grid grid-cols-1 items-start gap-x-4 gap-y-2 py-3 sm:grid-cols-2 xl:grid-cols-4"
    >
        {(opciones ?? []).map((o) => {
          const vinculada = vinculadas.includes(o.value)
          return (
            <label key={o.value} className="flex items-center gap-2">
              <Checkbox
                checked={vinculada || value.includes(o.value)}
                disabled={disabled || vinculada}
                onCheckedChange={(marcada) => alternar(o.value, marcada)}
              />
              {o.label}
            </label>
          )
        })}
    </MarcoOpciones>
  )
}

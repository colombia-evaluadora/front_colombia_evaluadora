import { Button } from "@/components/ui/button"
import { MinusIcon, PlusIcon } from "@/components/ui/icons"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"

export interface Filtro {
  key: string
  label: string
  options: { value: string; label: string }[]
  value: string
  /** Etiqueta de la opción vacía; por defecto «Todos». */
  todos?: string
}

/** Filtros a la vista, en una fila, como en C.5.REP.1 y C.5.PEN.1. */
export function FiltrosFila({ id, filtros, onChange }: { id: string; filtros: Filtro[]; onChange: (key: string, value: string) => void }) {
  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {filtros.map((f) => (
        <ComboOpciones
          key={f.key}
          id={`${id}-${f.key}`}
          label={f.label}
          todos={f.todos ?? "Todos"}
          value={f.value}
          options={f.options}
          onChange={(v) => onChange(f.key, v ?? "")}
        />
      ))}
    </div>
  )
}

/** Botón +/− de la fila expandible. */
export function BotonExpandir({ abierto, nombre, onClick }: { abierto: boolean; nombre: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      color="neutral"
      size="icon-sm"
      aria-expanded={abierto}
      aria-label={abierto ? `Ocultar el detalle de ${nombre}` : `Ver el detalle de ${nombre}`}
      onClick={onClick}
    >
      {abierto ? <MinusIcon /> : <PlusIcon />}
    </Button>
  )
}

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import type { ColumnaSiuce } from "@/features/gestion-estudiantil/convivencia/api/siuce-columnas"

interface Props {
  grupos: { grupo: string; items: ColumnaSiuce[] }[]
  seleccionadas: string[]
  onAlternar: (clave: string, marcada: boolean) => void
  onTodas: () => void
  onLimpiar: () => void
  busqueda: string
  onBusqueda: (texto: string) => void
  error?: string
}

/** Columnas del reporte por grupos, con búsqueda por nombre. */
export function SelectorColumnasSiuce({ grupos, seleccionadas, onAlternar, onTodas, onLimpiar, busqueda, onBusqueda, error }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Columnas*</span>
        <span className="text-xs text-muted-foreground">{seleccionadas.length} seleccionadas</span>
        <div className="ml-auto flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onTodas}>
            Seleccionar todas
          </Button>
          <Button type="button" size="sm" variant="outline" color="neutral" onClick={onLimpiar}>
            Limpiar
          </Button>
        </div>
      </div>
      <Field orientation="vertical" variant="outlined" className="gap-2">
        <FieldLabel htmlFor="siuce-buscar-columna">Buscar columna</FieldLabel>
        <Input id="siuce-buscar-columna" value={busqueda} onChange={(e) => onBusqueda(e.target.value)} />
      </Field>
      <div className="flex max-h-64 flex-col gap-4 overflow-y-auto rounded-lg border border-border px-4 py-3">
        {grupos.length === 0 && <p className="text-sm text-muted-foreground">Ninguna columna coincide con la búsqueda.</p>}
        {grupos.map(({ grupo, items }) => (
          <fieldset key={grupo} className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-medium text-muted-foreground">{grupo}</legend>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
              {items.map((c) => (
                <label key={c.clave} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={seleccionadas.includes(c.clave)} onCheckedChange={(v) => onAlternar(c.clave, Boolean(v))} />
                  {c.rotulo}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      {error && <FieldError>{error}</FieldError>}
    </div>
  )
}

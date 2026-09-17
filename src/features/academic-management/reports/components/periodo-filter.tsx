import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

import type { PeriodoInforme } from "@/features/academic-management/reports/api/types"

interface PeriodoFilterProps {
  periodos: PeriodoInforme[]
  seleccionados: number[]
  onChange: (periodos: number[]) => void
  cargando?: boolean
  mensajeVacio?: string
}

export function PeriodoFilter({
  periodos,
  seleccionados,
  onChange,
  cargando,
  mensajeVacio = "No hay períodos de evaluación para esta combinación.",
}: PeriodoFilterProps) {
  function toggle(periodo: number) {
    if (seleccionados.includes(periodo)) {
      onChange(seleccionados.filter((p) => p !== periodo))
    } else {
      onChange([...seleccionados, periodo])
    }
  }

  return (
    <fieldset className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-border bg-card px-3 py-1.5">
      <legend className="px-1 text-sm font-semibold text-muted-foreground">Período e informe</legend>
      {cargando && <span className="text-sm text-muted-foreground">Cargando períodos…</span>}
      {!cargando && periodos.length === 0 && (
        <span className="text-sm text-muted-foreground">{mensajeVacio}</span>
      )}
      {periodos.map((periodo) => (
        <div key={periodo.id} className="flex items-center gap-2">
          <Checkbox
            id={`periodo-${periodo.id}`}
            checked={seleccionados.includes(periodo.id)}
            onCheckedChange={() => toggle(periodo.id)}
          />
          <Label htmlFor={`periodo-${periodo.id}`} className="font-normal text-foreground">
            {periodo.nombre}
          </Label>
        </div>
      ))}
    </fieldset>
  )
}

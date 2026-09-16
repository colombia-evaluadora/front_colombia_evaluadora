import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

import { PERIODOS } from "@/features/academic-management/reports/api/mock-data"
import type { PeriodoId } from "@/features/academic-management/reports/api/types"

interface PeriodoFilterProps {
  seleccionados: PeriodoId[]
  onChange: (periodos: PeriodoId[]) => void
}

export function PeriodoFilter({ seleccionados, onChange }: PeriodoFilterProps) {
  function toggle(periodo: PeriodoId) {
    if (seleccionados.includes(periodo)) {
      onChange(seleccionados.filter((p) => p !== periodo))
    } else {
      onChange([...seleccionados, periodo].sort())
    }
  }

  return (
    <fieldset className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-md border border-border bg-card px-4 py-3">
      <legend className="mb-1 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Período e informe
      </legend>
      {PERIODOS.map((periodo) => (
        <div key={periodo.id} className="flex items-center gap-2">
          <Checkbox
            id={`periodo-${periodo.id}`}
            checked={seleccionados.includes(periodo.id)}
            onCheckedChange={() => toggle(periodo.id)}
          />
          <Label htmlFor={`periodo-${periodo.id}`} className="font-normal text-foreground">
            {periodo.label}
          </Label>
        </div>
      ))}
    </fieldset>
  )
}

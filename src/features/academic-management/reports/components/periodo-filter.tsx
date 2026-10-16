import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import {
  PERIODO_FINAL_ID,
  type PeriodoInforme,
} from "@/features/academic-management/reports/api/types"

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
          {/* El estado va debajo del nombre y abreviado (A/C) para no
              ensanchar la fila; el tooltip lo explica. */}
          <div className="flex flex-col items-start gap-0.5">
            <Label htmlFor={`periodo-${periodo.id}`} className="font-normal text-foreground">
              {periodo.nombre}
            </Label>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Badge
                    variant="soft"
                    color={periodo.cerrado ? "neutral" : "success"}
                    className="cursor-default"
                    aria-label={periodo.cerrado ? "Período cerrado" : "Período abierto"}
                  />
                }
              >
                {periodo.cerrado ? "C" : "A"}
              </TooltipTrigger>
              <TooltipContent>
                {periodo.cerrado
                  ? "Período cerrado: no se puede consolidar ni editar observaciones."
                  : "Período abierto: se puede consolidar y editar observaciones."}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      ))}
      {/* No va dentro del map: existe siempre, incluso mientras los períodos
          cargan, porque no depende del catálogo. Y entra al MISMO arreglo que
          los demás, que es lo que permite dejar marcado solo el Final. */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="periodo-final"
          checked={seleccionados.includes(PERIODO_FINAL_ID)}
          onCheckedChange={() => toggle(PERIODO_FINAL_ID)}
        />
        <Label htmlFor="periodo-final" className="font-normal text-foreground">
          Final
        </Label>
      </div>
    </fieldset>
  )
}

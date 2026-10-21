import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

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
          <Label htmlFor={`periodo-${periodo.id}`} className="font-normal text-foreground">
            {periodo.nombre}
          </Label>
          <MarcaEstadoPeriodo cerrado={periodo.cerrado} />
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

/**
 * Estado del período junto a su nombre: píldora con punto y la inicial (A/C),
 * azul si está abierto y neutra si está cerrado. El tooltip dice el estado
 * completo y qué implica.
 */
function MarcaEstadoPeriodo({ cerrado }: { cerrado: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            aria-label={cerrado ? "Período cerrado" : "Período abierto"}
            className={cn(
              "inline-flex cursor-default items-center gap-1 rounded-full border px-2 py-0.5 text-xs leading-none font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              cerrado
                ? "border-border bg-background text-muted-foreground"
                : "border-blue-stroke bg-blue-22 text-blue",
            )}
          />
        }
      >
        <span aria-hidden className="size-1.5 rounded-full bg-current" />
        {cerrado ? "C" : "A"}
      </TooltipTrigger>
      <TooltipContent>
        <span className="font-semibold">{cerrado ? "Cerrado" : "Abierto"}</span>
        {cerrado
          ? ": no se puede consolidar ni editar observaciones."
          : ": se puede consolidar y editar observaciones."}
      </TooltipContent>
    </Tooltip>
  )
}

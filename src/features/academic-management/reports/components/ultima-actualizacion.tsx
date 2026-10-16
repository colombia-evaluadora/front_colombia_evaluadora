import { format } from "date-fns"

import { InfoIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import type { FilaInforme } from "@/features/academic-management/reports/api/types"
import { ultimaActualizacionKey } from "@/features/academic-management/reports/api/query/use-ultima-actualizacion-query"

/** Encabezado de la columna, con la explicación en el tooltip. */
export function EncabezadoUltimaActualizacion({ className }: { className?: string }) {
  return (
    <th className={cn("border-l border-border px-3 py-3 text-center font-semibold uppercase", className)}>
      <Tooltip>
        <TooltipTrigger className="inline-flex items-center gap-1 outline-none">
          Actualizado
          <InfoIcon className="size-3 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>
          Último guardado del período: consolidación de notas u observación. Vacío si todavía no
          se ha guardado nada.
        </TooltipContent>
      </Tooltip>
    </th>
  )
}

interface CeldaUltimaActualizacionProps {
  fila: FilaInforme
  fechas: Map<string, string> | undefined
  /** Clases de la sub-fila: cada tabla tiene su propio alto. */
  className?: string
}

/** Fecha y hora (locales) del último guardado de ese período del estudiante;
 *  vacía si nunca se guardó nada. */
export function CeldaUltimaActualizacion({ fila, fechas, className }: CeldaUltimaActualizacionProps) {
  const valor = fechas?.get(ultimaActualizacionKey(fila.matriculaId, fila.periodoId))
  const fecha = valor ? new Date(valor) : null
  const valida = fecha != null && !Number.isNaN(fecha.getTime())
  return (
    <div className={cn("whitespace-nowrap text-muted-foreground", className)}>
      {valida ? (
        <>
          {format(fecha, "dd/MM/yyyy")}{" "}
          <span className="text-xs">{format(fecha, "h:mm a")}</span>
        </>
      ) : (
        // Las columnas apilan sus sub-filas por separado: vacía, la celda
        // perdería su alto y desalinearía las filas de abajo.
        " "
      )}
    </div>
  )
}

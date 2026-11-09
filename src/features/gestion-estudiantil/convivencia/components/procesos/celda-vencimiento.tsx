import { InfoIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import type { ProcesoRow } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { textoVencimiento } from "@/features/gestion-estudiantil/convivencia/api/procesos-ui"
import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"

/** Próximo vencimiento con el ícono (i) que dice de qué plazo es. */
export function CeldaVencimiento({ proceso }: { proceso: ProcesoRow }) {
  if (!proceso.proximo_vencimiento) return <span>—</span>
  const texto = textoVencimiento(proceso)
  return (
    <span className="flex items-center gap-1.5">
      <span>{formatFecha(proceso.proximo_vencimiento)}</span>
      {texto && (
        <Tooltip>
          <TooltipTrigger
            render={<span role="img" aria-label={texto} className="inline-flex text-muted-foreground" />}
          >
            <InfoIcon className="size-4" />
          </TooltipTrigger>
          <TooltipContent>{texto}</TooltipContent>
        </Tooltip>
      )}
    </span>
  )
}

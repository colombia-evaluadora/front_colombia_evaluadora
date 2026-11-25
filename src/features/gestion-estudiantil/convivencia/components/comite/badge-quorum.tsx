import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { textoMotivoQuorum } from "@/features/gestion-estudiantil/convivencia/utils/comite"

/** Con quórum (éxito) o Sin quórum (advertencia); con motivo, un tooltip explica por qué no lo hay. */
export function BadgeQuorum({ conQuorum, motivo }: { conQuorum: boolean; motivo?: string | null }) {
  const texto = conQuorum ? null : textoMotivoQuorum(motivo)
  const badge = (
    <Badge variant="soft" color={conQuorum ? "success" : "warning"}>
      <span>{conQuorum ? "Con quórum" : "Sin quórum"}</span>
    </Badge>
  )
  if (!texto) return badge
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>{badge}</TooltipTrigger>
      <TooltipContent>{texto}</TooltipContent>
    </Tooltip>
  )
}

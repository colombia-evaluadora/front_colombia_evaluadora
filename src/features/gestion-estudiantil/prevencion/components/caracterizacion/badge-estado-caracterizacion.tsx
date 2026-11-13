import { Badge } from "@/components/ui/badge"

import type { EstadoCaracterizacion } from "@/features/gestion-estudiantil/prevencion/api/types"
import { ESTADO_CARACTERIZACION_COLOR } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"

/** Estado de la caracterización: Sin diligenciar, Por confirmar o Confirmada. */
export function BadgeEstadoCaracterizacion({ estado, nombre }: { estado: EstadoCaracterizacion; nombre: string }) {
  return (
    <Badge variant="soft" color={ESTADO_CARACTERIZACION_COLOR[estado]}>
      <span>{nombre}</span>
    </Badge>
  )
}

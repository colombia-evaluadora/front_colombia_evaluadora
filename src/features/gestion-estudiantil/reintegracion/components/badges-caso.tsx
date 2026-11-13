import { Badge } from "@/components/ui/badge"

import type { EstadoCaso } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { ESTADO_CASO_COLOR } from "@/features/gestion-estudiantil/reintegracion/api/ui-mappings"

/** Estado del caso (§10.5), con «Pendiente de validación» al lado cuando espera al Administrador. */
export function BadgesEstadoCaso({
  estado,
  etiqueta,
  pendienteValidacion,
}: {
  estado: EstadoCaso
  etiqueta: string
  pendienteValidacion: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Badge variant="soft" color={ESTADO_CASO_COLOR[estado]}>
        <span>{etiqueta}</span>
      </Badge>
      {pendienteValidacion && (
        <Badge variant="soft" color="warning">
          <span>Pendiente de validación</span>
        </Badge>
      )}
    </div>
  )
}

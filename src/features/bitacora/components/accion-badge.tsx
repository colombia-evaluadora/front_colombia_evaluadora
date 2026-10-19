import { Badge } from "@/components/ui/badge"

import type { BitacoraAccion } from "@/features/bitacora/api/types/bitacora"

const COLOR: Record<BitacoraAccion, "success" | "info" | "warning" | "destructive" | "secondary"> = {
  Crear: "success",
  Modificar: "info",
  "Cambio de estado": "warning",
  Eliminar: "destructive",
  Restauración: "secondary",
}

export function AccionBadge({ accion }: { accion: BitacoraAccion }) {
  return (
    <Badge variant="soft" color={COLOR[accion]}>
      {accion}
    </Badge>
  )
}

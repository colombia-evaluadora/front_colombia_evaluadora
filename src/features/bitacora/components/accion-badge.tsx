import { Badge } from "@/components/ui/badge"

import { BITACORA_ACCIONES, type BitacoraAccion } from "@/features/bitacora/api/types/bitacora"

const COLOR: Record<BitacoraAccion, "success" | "info" | "warning" | "destructive" | "secondary"> = {
  CREAR: "success",
  MODIFICAR: "info",
  CAMBIO_ESTADO: "warning",
  ELIMINAR: "destructive",
  RESTAURACION: "secondary",
}

export function AccionBadge({ accion }: { accion: BitacoraAccion }) {
  return (
    <Badge variant="soft" color={COLOR[accion] ?? "secondary"}>
      {BITACORA_ACCIONES[accion] ?? accion}
    </Badge>
  )
}

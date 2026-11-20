import { Badge } from "@/components/ui/badge"

import { ESTADOS_DOCUMENTO, type EstadoDocumento } from "@/features/bitacora/api/types/documentos"

const COLOR_ESTADO: Record<EstadoDocumento, "success" | "warning" | "destructive"> = {
  VIGENTE: "success",
  REEMPLAZADO: "warning",
  ANULADO: "destructive",
}

/** Estado de un documento emitido: Vigente (verde), Reemplazado (amarillo) o Anulado (rojo). */
export function EstadoDocumentoBadge({ estado }: { estado: EstadoDocumento }) {
  return (
    <Badge variant="soft" color={COLOR_ESTADO[estado]}>
      {ESTADOS_DOCUMENTO[estado]}
    </Badge>
  )
}

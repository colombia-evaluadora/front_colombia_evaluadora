import { Badge } from "@/components/ui/badge"

import type { EstadoOrientacionRecibida } from "@/features/establishment/institution/api/schema"
import { ESTADO_ORIENTACION_UI } from "@/features/establishment/institution/utils/orientaciones"

/** Enviada (azul) o Atendida (verde), como en el prototipo. */
export function EstadoOrientacionBadge({ estado }: { estado: EstadoOrientacionRecibida }) {
  return (
    <Badge variant="soft" color={ESTADO_ORIENTACION_UI[estado].color}>
      {ESTADO_ORIENTACION_UI[estado].label}
    </Badge>
  )
}

import { Badge } from "@/components/ui/badge"

import type { EstadoAcompanamiento, EstadoReporteConsumo } from "@/features/gestion-estudiantil/prevencion/api/types"
import {
  ESTADO_ACOMP_COLOR,
  ESTADO_REPORTE_CONSUMO_COLOR,
} from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"

/** Estado del acompañamiento (Abierto, En seguimiento, Cerrado, Anulado). */
export function BadgeEstadoAcomp({ estado, nombre }: { estado: EstadoAcompanamiento; nombre: string }) {
  return (
    <Badge variant="soft" color={ESTADO_ACOMP_COLOR[estado]}>
      <span>{nombre}</span>
    </Badge>
  )
}

/** Estado de un reporte de posible consumo (Pendiente de revisión, Recibido, Atendido). */
export function BadgeEstadoReporteConsumo({ estado, nombre }: { estado: EstadoReporteConsumo; nombre: string }) {
  return (
    <Badge variant="soft" color={ESTADO_REPORTE_CONSUMO_COLOR[estado]}>
      <span>{nombre}</span>
    </Badge>
  )
}

/** Estado de la matrícula bajo el contexto (Cursando en verde; el resto, neutro). */
export function BadgeEstadoMatricula({ nombre }: { nombre: string | null }) {
  if (!nombre) return null
  return (
    <Badge variant="soft" color={nombre === "Cursando" ? "success" : "muted"}>
      <span>{nombre}</span>
    </Badge>
  )
}

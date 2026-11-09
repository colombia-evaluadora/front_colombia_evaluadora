import { Badge } from "@/components/ui/badge"

import type { CompromisoRow } from "@/features/gestion-estudiantil/citaciones/api/types"
import { COLOR_ESTADO_COMPROMISO } from "@/features/gestion-estudiantil/citaciones/api/ui-mappings"
import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"

/** Línea bajo el título de los modales de compromiso: tipo, fechas y estado (G.3.CMP.5/6). */
export function ResumenCompromiso({ c, conEstado = false, conAcudiente = false }: { c: CompromisoRow; conEstado?: boolean; conAcudiente?: boolean }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>
        Compromiso {c.tipo_nombre.toLowerCase()} · {formatFecha(c.fecha)} · Revisión {formatFecha(c.fecha_revision)}
        {conAcudiente && ` · Acudiente: ${c.acudiente_nombre ?? "Sin acudiente registrado"}`}
      </span>
      {conEstado && (
        <Badge variant="soft" color={COLOR_ESTADO_COMPROMISO[c.estado_valor] ?? "muted"}>
          <span>{c.estado_nombre}</span>
        </Badge>
      )}
    </span>
  )
}

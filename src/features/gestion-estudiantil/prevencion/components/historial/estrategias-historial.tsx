import { Link } from "@tanstack/react-router"

import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { HistorialEstrategia } from "@/features/gestion-estudiantil/prevencion/api/types"
import { paths } from "@/config/paths"

/** «Estrategias: <nombre> (desde dd/mm/aaaa) · …» (G.8.TAB.7); cada nombre abre el detalle de la estrategia. */
export function EstrategiasHistorial({ estrategias }: { estrategias: HistorialEstrategia[] }) {
  if (estrategias.length === 0) return null
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">Estrategias: </span>
      {estrategias.map((e, i) => (
        <span key={e.id}>
          {i > 0 && " · "}
          <Link to={paths.app.prevencionEstrategiaDetalle.getHref(e.id) as never} className="text-primary hover:underline">
            {e.nombre}
          </Link>{" "}
          (desde {formatFecha(e.fecha_ingreso)}
          {e.fecha_salida ? `, hasta ${formatFecha(e.fecha_salida)}` : ""}
          {e.resultado_salida_nombre ? ` · ${e.resultado_salida_nombre}` : ""})
        </span>
      ))}
    </p>
  )
}

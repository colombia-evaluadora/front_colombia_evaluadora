import { Badge } from "@/components/ui/badge"

import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { NivelRiesgo } from "@/features/gestion-estudiantil/prevencion/api/types"
import type { FilaHistorial } from "@/features/gestion-estudiantil/prevencion/utils/historial"
import { NIVEL_COLOR } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"

/** Línea de tiempo del historial (G.8.TAB.7): fecha, tipo en negrita y detalle, con separadores entre filas. */
export function LineaTiempo({ filas }: { filas: FilaHistorial[] }) {
  if (filas.length === 0) {
    return <p className="text-sm text-muted-foreground">Aún no hay valoraciones, planes ni anotaciones de permanencia.</p>
  }
  return (
    <ol className="flex flex-col divide-y divide-border">
      {filas.map((f) => (
        <li key={f.clave} className="grid grid-cols-1 gap-1 py-3 text-sm sm:grid-cols-[8rem_1fr]">
          <span className="text-muted-foreground">{formatFecha(f.fecha)}</span>
          <div className="flex flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-2">
              <strong className="font-semibold">{f.titulo}</strong>
              {f.nivel && (
                <Badge variant="soft" color={NIVEL_COLOR[f.nivel.toUpperCase() as NivelRiesgo] ?? "muted"}>
                  <span>{f.nivel}</span>
                </Badge>
              )}
            </span>
            {f.detalle && <span>{f.detalle}</span>}
            {f.autor && <span className="text-xs text-muted-foreground">{f.autor}</span>}
          </div>
        </li>
      ))}
    </ol>
  )
}

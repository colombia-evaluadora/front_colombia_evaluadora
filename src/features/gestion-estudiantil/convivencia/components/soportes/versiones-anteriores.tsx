import { Badge } from "@/components/ui/badge"

import type { SoporteAccion } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { formatPeso } from "@/features/gestion-estudiantil/convivencia/utils/soportes"

/** «Versiones anteriores (n)»: soportes sustituidos o retirados, con su motivo. */
export function VersionesAnteriores({ soportes, todos = soportes }: { soportes: SoporteAccion[]; todos?: SoporteAccion[] }) {
  if (!soportes.length) return null
  // Un soporte vigente apunta con `fk_soporte_sustituido` al que reemplazó: ese quedó «Sustituido»; el resto, «Retirado».
  const sustituidos = new Set(todos.map((t) => t.fk_soporte_sustituido).filter((id): id is number => id != null))
  return (
    <SeccionPlegable encuadrada defaultAbierta={false} titulo={`Versiones anteriores (${soportes.length})`} contentClassName="px-0 py-0">
      <ul className="flex flex-col divide-y divide-border">
        {soportes.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate font-medium">{[s.nombre, s.tipo, formatPeso(s.peso)].filter(Boolean).join(" · ")}</span>
              <span className="text-xs text-muted-foreground">
                {sustituidos.has(s.id) ? "Sustituido" : "Retirado"} por {s.retirado_por ?? s.autor ?? "—"}
                {s.retirado_en && ` el ${formatFecha(s.retirado_en)}`}
                {s.motivo_retiro && ` · Motivo: ${s.motivo_retiro}`}
              </span>
            </div>
            <Badge variant="soft" color="muted">
              Versión anterior
            </Badge>
          </li>
        ))}
      </ul>
    </SeccionPlegable>
  )
}
